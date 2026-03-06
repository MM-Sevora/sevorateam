import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Users, Shield, CheckCircle, XCircle, Clock, Loader2, Plus, Trash2,
  Send, MessageSquare, AlertTriangle, Sparkles, Zap, FileText, RefreshCw, Eye
} from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access', color: '#7c3aed' },
  { value: 'editor', label: 'Editor', desc: 'Create & publish', color: '#06b6d4' },
  { value: 'reviewer', label: 'Reviewer', desc: 'Approve content', color: '#f59e0b' },
  { value: 'viewer', label: 'Viewer', desc: 'View only', color: '#71717a' },
];

export default function TeamAndBrandVoice() {
  const [tab, setTab] = useState('approvals');
  // Team
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  // Approvals
  const [approvals, setApprovals] = useState([]);
  const [approvalStats, setApprovalStats] = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState({});
  const [reviewing, setReviewing] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  // Brand Voice
  const [brandVoice, setBrandVoice] = useState(null);
  const [training, setTraining] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [samplePosts, setSamplePosts] = useState('');
  const [bvTopic, setBvTopic] = useState('');
  const [bvPlatform, setBvPlatform] = useState('linkedin');
  const [bvResult, setBvResult] = useState(null);
  const [bvGenerating, setBvGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [membersRes, approvalsRes, statsRes, bvRes] = await Promise.all([
        api.get('/api/team/members'),
        api.get('/api/approvals'),
        api.get('/api/approvals/stats'),
        api.get('/api/brand-voice'),
      ]);
      setMembers(membersRes.data);
      setApprovals(approvalsRes.data);
      setApprovalStats(statsRes.data);
      if (bvRes.data && bvRes.data.voice_profile) setBrandVoice(bvRes.data);
    } catch (err) { console.error(err); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setError('');
    try {
      await api.post('/api/team/invite', { email: inviteEmail, role: inviteRole, name: inviteName });
      setInviteEmail(''); setInviteName('');
      await fetchAll();
    } catch (err) { setError(err.response?.data?.detail || 'Failed to invite'); }
    finally { setInviting(false); }
  };

  const handleRemoveMember = async (id) => {
    if (!window.confirm('Remove team member?')) return;
    try { await api.delete(`/api/team/${id}`); setMembers(prev => prev.filter(m => m.member_id !== id)); }
    catch (err) { console.error(err); }
  };

  const handleReview = async (approvalId, action) => {
    setReviewing(approvalId);
    try {
      await api.post(`/api/approvals/${approvalId}/review`, { action, feedback: reviewFeedback[approvalId] || '' });
      await fetchAll();
    } catch (err) { setError(err.response?.data?.detail || 'Review failed'); }
    finally { setReviewing(''); }
  };

  const handleTrainVoice = async () => {
    setTraining(true); setError('');
    try {
      const samples = samplePosts.split('\n---\n').map(s => s.trim()).filter(Boolean);
      const res = await api.post('/api/brand-voice/train', { sample_posts: samples, brand_name: brandName });
      setBrandVoice(res.data);
    } catch (err) { setError(err.response?.data?.detail || 'Training failed'); }
    finally { setTraining(false); }
  };

  const handleGenerateWithVoice = async () => {
    if (!bvTopic.trim()) return;
    setBvGenerating(true); setBvResult(null);
    try {
      const res = await api.post('/api/brand-voice/generate', { topic: bvTopic, platform: bvPlatform });
      setBvResult(res.data);
    } catch (err) { setError(err.response?.data?.detail || 'Generation failed'); }
    finally { setBvGenerating(false); }
  };

  const tabs = [
    { key: 'approvals', label: 'Approvals', icon: CheckCircle, badge: approvalStats.pending },
    { key: 'team', label: 'Team', icon: Users, badge: members.length },
    { key: 'voice', label: 'Brand Voice', icon: Sparkles },
  ];

  const vp = brandVoice?.voice_profile || {};

  return (
    <div className="space-y-6 animate-fade-in" data-testid="team-page">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Team & Brand Voice</h1>
        <p className="text-zinc-400 mt-1">Approval workflows, team management, and AI brand voice training</p>
      </div>

      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl border border-white/5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-accent-violet/15 text-accent-violet' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            data-testid={`team-tab-${t.key}`}
          ><t.icon className="w-4 h-4" /> {t.label} {t.badge > 0 && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{t.badge}</span>}</button>
        ))}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      {/* APPROVALS TAB */}
      {tab === 'approvals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Pending', value: approvalStats.pending || 0, color: '#f59e0b', icon: Clock },
              { label: 'Approved', value: approvalStats.approved || 0, color: '#10b981', icon: CheckCircle },
              { label: 'Rejected', value: approvalStats.rejected || 0, color: '#ef4444', icon: XCircle },
              { label: 'Changes', value: approvalStats.changes_requested || 0, color: '#7c3aed', icon: RefreshCw },
            ].map(s => (
              <div key={s.label} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1"><s.icon className="w-3.5 h-3.5" style={{ color: s.color }} /><span className="text-[10px] text-zinc-500 uppercase">{s.label}</span></div>
                <p className="text-xl font-heading font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {['', 'pending', 'approved', 'rejected', 'changes_requested'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filterStatus === s ? 'bg-accent-violet/10 text-accent-violet' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              >{s || 'All'}</button>
            ))}
          </div>

          {approvals.filter(a => !filterStatus || a.status === filterStatus).length > 0 ? (
            <div className="space-y-2">
              {approvals.filter(a => !filterStatus || a.status === filterStatus).map(a => (
                <div key={a.approval_id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4" data-testid={`approval-${a.approval_id}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-white capitalize">{a.platform}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : a.status === 'rejected' ? 'bg-red-500/10 text-red-400' : a.status === 'changes_requested' ? 'bg-accent-violet/10 text-accent-violet' : 'bg-amber-500/10 text-amber-400'}`}>{a.status.replace('_', ' ')}</span>
                        <span className="text-[10px] text-zinc-600">{new Date(a.submitted_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2">{a.content_preview}</p>
                      {a.note && <p className="text-xs text-zinc-500 mt-1">Note: {a.note}</p>}
                      {a.reviews?.map((r, i) => (
                        <div key={i} className={`mt-2 p-2 rounded-lg text-xs ${r.action === 'approve' ? 'bg-emerald-500/10 text-emerald-400' : r.action === 'reject' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          <span className="font-medium">{r.reviewer}</span>: {r.action} {r.feedback && `- "${r.feedback}"`}
                        </div>
                      ))}
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <input type="text" value={reviewFeedback[a.approval_id] || ''} onChange={(e) => setReviewFeedback(prev => ({ ...prev, [a.approval_id]: e.target.value }))}
                          className="bg-zinc-950/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder-zinc-600 w-48" placeholder="Feedback (optional)" />
                        <div className="flex gap-1">
                          <button onClick={() => handleReview(a.approval_id, 'approve')} disabled={!!reviewing}
                            className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-1.5 flex items-center justify-center gap-1 disabled:opacity-50">
                            {reviewing === a.approval_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                          </button>
                          <button onClick={() => handleReview(a.approval_id, 'reject')} disabled={!!reviewing}
                            className="flex-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded-lg py-1.5 flex items-center justify-center gap-1 disabled:opacity-50">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                          <button onClick={() => handleReview(a.approval_id, 'request_changes')} disabled={!!reviewing}
                            className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-1.5 px-2 flex items-center gap-1 disabled:opacity-50">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12"><CheckCircle className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No approvals yet. Submit posts for review from Content Studio.</p></div>
          )}
        </div>
      )}

      {/* TEAM TAB */}
      {tab === 'team' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
            <h3 className="text-sm font-heading font-semibold text-white mb-3">Invite Team Member</h3>
            <div className="flex gap-3 flex-wrap">
              <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 w-40" placeholder="Name" />
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 min-w-[200px]" placeholder="email@company.com" data-testid="invite-email" />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white">
                {ROLES.map(r => <option key={r.value} value={r.value} className="bg-zinc-900">{r.label} - {r.desc}</option>)}
              </select>
              <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50" data-testid="invite-button"
              >{inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Invite</button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-2">
            {ROLES.map(r => (
              <div key={r.value} className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 text-center">
                <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${r.color}20` }}>
                  <Shield className="w-4 h-4" style={{ color: r.color }} />
                </div>
                <p className="text-xs font-medium text-white">{r.label}</p>
                <p className="text-[10px] text-zinc-500">{r.desc}</p>
              </div>
            ))}
          </div>

          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map(m => {
                const role = ROLES.find(r => r.value === m.role) || ROLES[3];
                return (
                  <div key={m.member_id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center gap-3" data-testid={`member-${m.member_id}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${role.color}20` }}>
                      <span className="text-sm font-bold" style={{ color: role.color }}>{m.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{m.name}</p>
                      <p className="text-xs text-zinc-500">{m.email}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: `${role.color}15`, color: role.color }}>{role.label}</span>
                    <span className="text-[10px] text-zinc-600">{m.status}</span>
                    <button onClick={() => handleRemoveMember(m.member_id)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8"><Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No team members yet. Invite your first team member above.</p></div>
          )}
        </div>
      )}

      {/* BRAND VOICE TAB */}
      {tab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Train Your Brand Voice
              </h3>
              <p className="text-xs text-zinc-400 mb-3">Paste sample posts (separate with ---) or we'll analyze your published posts</p>
              <div className="mb-3">
                <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500 mb-2" placeholder="Brand name (e.g., Sevora)" />
                <textarea value={samplePosts} onChange={(e) => setSamplePosts(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-lg py-3 px-4 text-sm text-white placeholder-zinc-500 resize-none" rows={5}
                  placeholder={"Paste sample posts here...\n---\nSeparate posts with triple dashes\n---\nOr leave empty to analyze your published content"} />
              </div>
              <button onClick={handleTrainVoice} disabled={training}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.3)]" data-testid="train-voice-button"
              >{training ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {training ? 'Analyzing...' : 'Train Brand Voice'}</button>
            </div>

            {brandVoice && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-heading font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-violet" /> Generate with Voice
                </h3>
                <div className="flex gap-3 mb-3">
                  <input type="text" value={bvTopic} onChange={(e) => setBvTopic(e.target.value)} className="flex-1 bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder-zinc-500" placeholder="Topic for the post..." />
                  <select value={bvPlatform} onChange={(e) => setBvPlatform(e.target.value)} className="bg-zinc-950/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white">
                    {['linkedin', 'instagram', 'facebook', 'twitter'].map(p => <option key={p} value={p} className="bg-zinc-900">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <button onClick={handleGenerateWithVoice} disabled={bvGenerating || !bvTopic.trim()}
                  className="bg-accent-violet hover:bg-accent-violet-hover text-white rounded-lg font-medium px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50" data-testid="generate-voice-button"
                >{bvGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate in Brand Voice</button>
                {bvResult && (
                  <div className="mt-3 bg-zinc-950/50 rounded-lg p-4 border border-accent-violet/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-400">Generated Content</span>
                      {bvResult.voice_match_score && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Voice match: {bvResult.voice_match_score}%</span>}
                    </div>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{bvResult.content}</p>
                    {bvResult.voice_notes && <p className="text-[10px] text-zinc-500 mt-2 bg-zinc-900/50 p-2 rounded">{bvResult.voice_notes}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Brand Voice Profile Display */}
          <div className="space-y-4">
            {brandVoice ? (
              <>
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2"><Eye className="w-4 h-4 text-accent-cyan" /> Voice Profile: {brandVoice.brand_name}</h3>
                    <span className="text-[10px] text-zinc-500">Trained on {brandVoice.sample_count} posts</span>
                  </div>
                  <p className="text-sm text-zinc-300 mb-4 bg-zinc-950/50 p-3 rounded-lg">{vp.voice_summary}</p>
                  {vp.tone_attributes?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Tone</p>
                      <div className="flex flex-wrap gap-2">{vp.tone_attributes.map((t, i) => <span key={i} className="text-xs bg-accent-violet/10 text-accent-violet px-3 py-1 rounded-lg">{t}</span>)}</div>
                    </div>
                  )}
                  {vp.writing_style && (
                    <div className="mb-4">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Writing Style</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(vp.writing_style).map(([k, v]) => (
                          <div key={k} className="bg-zinc-800/80 rounded-lg p-2"><p className="text-[10px] text-zinc-500">{k.replace('_', ' ')}</p><p className="text-xs text-white">{v}</p></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {vp.do_list?.length > 0 && (
                    <div className="bg-zinc-900/50 border border-emerald-500/10 rounded-xl p-4">
                      <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-2 font-semibold">DO</p>
                      <div className="space-y-1">{vp.do_list.map((d, i) => <p key={i} className="text-xs text-zinc-300 flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />{d}</p>)}</div>
                    </div>
                  )}
                  {vp.dont_list?.length > 0 && (
                    <div className="bg-zinc-900/50 border border-red-500/10 rounded-xl p-4">
                      <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2 font-semibold">DON'T</p>
                      <div className="space-y-1">{vp.dont_list.map((d, i) => <p key={i} className="text-xs text-zinc-300 flex items-start gap-1.5"><XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />{d}</p>)}</div>
                    </div>
                  )}
                </div>
                {vp.example_phrases?.length > 0 && (
                  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Signature Phrases</p>
                    <div className="flex flex-wrap gap-2">{vp.example_phrases.map((p, i) => <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg italic">"{p}"</span>)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-12 text-center">
                <Sparkles className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <h3 className="text-sm font-heading font-semibold text-zinc-400">No Brand Voice Trained Yet</h3>
                <p className="text-xs text-zinc-600 mt-1">Train your AI to write in your brand's unique voice</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
