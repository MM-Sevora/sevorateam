import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Search, Package, Users, Key, ExternalLink, Edit, Trash2,
  UserPlus, X, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Eye, EyeOff,
  Copy, Shield, FileText, Lock
} from 'lucide-react';

// Constants
const CATEGORIES = ['Marketing', 'Design', 'Development', 'Finance', 'HR', 'Sales', 'Operations', 'Communication', 'Analytics', 'Security', 'Other'];
const ACCESS_LEVELS = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700' },
  { value: 'editor', label: 'Editor', color: 'bg-blue-100 text-blue-700' },
  { value: 'viewer', label: 'Viewer', color: 'bg-green-100 text-green-700' }
];
const REQUEST_STATUS = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  manager_approved: { label: 'Manager OK', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
};

const ITAdminHub = () => {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tools');
  
  // Tools & Access state
  const [tools, setTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTool, setExpandedTool] = useState(null);
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [toolForm, setToolForm] = useState({ name: '', url: '', category: 'Other', description: '' });
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessToolId, setAccessToolId] = useState(null);
  const [accessForm, setAccessForm] = useState({ user_id: '', access_level: 'viewer' });
  
  // Requests state
  const [requests, setRequests] = useState([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState({ tool_id: '', reason: '', requested_level: 'viewer' });
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionComments, setActionComments] = useState('');
  
  // Credentials state
  const [credentials, setCredentials] = useState([]);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [showCredDialog, setShowCredDialog] = useState(false);
  const [credForm, setCredForm] = useState({ tool_id: '', login_email: '', password: '', notes: '' });
  
  // Audit Logs state
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const [toolsRes, usersRes, requestsRes, credsRes, logsRes] = await Promise.all([
        api.get('/acms/tools?limit=100'),
        api.get('/admin/users?limit=200'),
        api.get('/acms/requests?limit=100'),
        api.get('/acms/credentials'),
        api.get('/acms/audit-logs?limit=50')
      ]);
      setTools(toolsRes.data.tools || []);
      // /admin/users returns array directly, not { users: [] }
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
      setRequests(requestsRes.data.requests || []);
      setCredentials(credsRes.data.credentials || []);
      setLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ====== TOOLS & ACCESS ======
  const fetchToolAccess = async (toolId) => {
    try {
      const res = await api.get(`/acms/access?tool_id=${toolId}&limit=100`);
      return res.data.access_records || [];
    } catch { return []; }
  };

  const handleToolSubmit = async () => {
    if (!toolForm.name) { toast.error('Name is required'); return; }
    try {
      if (editingTool) {
        await api.put(`/acms/tools/${editingTool.id}`, toolForm);
        toast.success('Tool updated');
      } else {
        await api.post('/acms/tools', toolForm);
        toast.success('Tool added');
      }
      setShowToolDialog(false);
      setToolForm({ name: '', url: '', category: 'Other', description: '' });
      setEditingTool(null);
      fetchAllData();
    } catch { toast.error('Failed to save tool'); }
  };

  const handleDeleteTool = async (tool) => {
    if (!confirm(`Delete "${tool.name}"?`)) return;
    try {
      await api.delete(`/acms/tools/${tool.id}`);
      toast.success('Tool deleted');
      fetchAllData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleGrantAccess = async () => {
    if (!accessForm.user_id) { toast.error('Select a user'); return; }
    try {
      await api.post('/acms/access', { tool_id: accessToolId, ...accessForm });
      toast.success('Access granted');
      setShowAccessDialog(false);
      setAccessForm({ user_id: '', access_level: 'viewer' });
      if (expandedTool === accessToolId) {
        const access = await fetchToolAccess(accessToolId);
        setTools(prev => prev.map(t => t.id === accessToolId ? { ...t, _access: access } : t));
      }
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleRevokeAccess = async (accessId, userName) => {
    if (!confirm(`Revoke access for ${userName}?`)) return;
    try {
      await api.delete(`/acms/access/${accessId}`);
      toast.success('Access revoked');
      if (expandedTool) {
        const access = await fetchToolAccess(expandedTool);
        setTools(prev => prev.map(t => t.id === expandedTool ? { ...t, _access: access } : t));
      }
    } catch { toast.error('Failed'); }
  };

  const toggleExpand = async (toolId) => {
    if (expandedTool === toolId) { setExpandedTool(null); }
    else {
      const access = await fetchToolAccess(toolId);
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, _access: access } : t));
      setExpandedTool(toolId);
    }
  };

  // ====== REQUESTS ======
  const handleSubmitRequest = async () => {
    if (!requestForm.tool_id) { toast.error('Select a tool'); return; }
    try {
      await api.post('/acms/requests', requestForm);
      toast.success('Request submitted');
      setShowRequestDialog(false);
      setRequestForm({ tool_id: '', reason: '', requested_level: 'viewer' });
      fetchAllData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleRequestAction = async () => {
    if (!selectedRequest) return;
    try {
      const endpoint = selectedRequest.status === 'pending' 
        ? `/acms/requests/${selectedRequest.id}/manager-action`
        : `/acms/requests/${selectedRequest.id}/admin-action`;
      await api.post(endpoint, { action: actionType, comments: actionComments });
      toast.success(`Request ${actionType}d`);
      setShowActionDialog(false);
      setSelectedRequest(null);
      setActionComments('');
      fetchAllData();
    } catch { toast.error('Failed'); }
  };

  // ====== CREDENTIALS ======
  const handleRevealPassword = async (credId) => {
    if (revealedPasswords[credId]) { setRevealedPasswords(p => ({ ...p, [credId]: null })); return; }
    try {
      const res = await api.get(`/acms/credentials/${credId}?reveal_password=true`);
      setRevealedPasswords(p => ({ ...p, [credId]: { password: res.data.password, two_factor: res.data.two_factor_backup } }));
      toast.success('Password revealed');
    } catch { toast.error('Failed'); }
  };

  const handleSaveCredential = async () => {
    if (!credForm.tool_id || !credForm.password) { toast.error('Tool and password required'); return; }
    try {
      await api.post('/acms/credentials', credForm);
      toast.success('Credential saved');
      setShowCredDialog(false);
      setCredForm({ tool_id: '', login_email: '', password: '', notes: '' });
      fetchAllData();
    } catch { toast.error('Failed'); }
  };

  const handleDeleteCredential = async (cred) => {
    if (!confirm('Delete this credential?')) return;
    try {
      await api.delete(`/acms/credentials/${cred.id}`);
      toast.success('Deleted');
      fetchAllData();
    } catch { toast.error('Failed'); }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // Filtered data
  const filteredTools = tools.filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLogs = logs.filter(l => !logFilter || l.action === logFilter);
  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'manager_approved');

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="it-admin-hub">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-[#8B7355] hover:text-[#4A3728]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">IT Administration</h1>
          <p className="text-[#8B7355]">Manage tools, access, credentials & audit logs</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-[#E8D5C4] p-1">
          <TabsTrigger value="tools" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Package className="w-4 h-4 mr-2" /> Tools & Access
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Clock className="w-4 h-4 mr-2" /> Requests
            {pendingRequests.length > 0 && <Badge className="ml-2 bg-amber-500 text-white">{pendingRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="credentials" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Shield className="w-4 h-4 mr-2" /> Credentials
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" /> Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* ====== TOOLS TAB ====== */}
        <TabsContent value="tools" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input placeholder="Search tools..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-[#D4BBA6]" />
            </div>
            <Button onClick={() => { setEditingTool(null); setToolForm({ name: '', url: '', category: 'Other', description: '' }); setShowToolDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Tool
            </Button>
          </div>

          {loading ? <div className="text-center py-8 text-[#8B7355]">Loading...</div> : (
            <div className="space-y-2">
              {filteredTools.map(tool => (
                <Card key={tool.id} className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleExpand(tool.id)}>
                        <div className="w-10 h-10 bg-[#F5EDE5] rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-[#4A3728]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#4A3728]">{tool.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-[#8B7355]">
                            <Badge variant="outline">{tool.category || 'Other'}</Badge>
                            <span><Users className="w-3 h-3 inline mr-1" />{tool.user_count || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {tool.url && <a href={tool.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-[#F5EDE5] rounded"><ExternalLink className="w-4 h-4 text-blue-600" /></a>}
                        <Button variant="ghost" size="sm" onClick={() => { setAccessToolId(tool.id); setShowAccessDialog(true); }}><UserPlus className="w-4 h-4 text-emerald-600" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingTool(tool); setToolForm({ name: tool.name, url: tool.url || '', category: tool.category || 'Other', description: tool.description || '' }); setShowToolDialog(true); }}><Edit className="w-4 h-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTool(tool)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleExpand(tool.id)}>{expandedTool === tool.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button>
                      </div>
                    </div>
                    {expandedTool === tool.id && (
                      <div className="mt-4 pt-4 border-t border-[#E8D5C4]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#4A3728]">User Access</span>
                          <Button size="sm" variant="outline" onClick={() => { setAccessToolId(tool.id); setShowAccessDialog(true); }} className="text-xs border-[#D4BBA6]"><UserPlus className="w-3 h-3 mr-1" /> Add</Button>
                        </div>
                        {tool._access?.length > 0 ? (
                          <div className="space-y-2">
                            {tool._access.map(a => (
                              <div key={a.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-[#D4BBA6] rounded-full flex items-center justify-center text-white text-xs">{a.user_name?.charAt(0)}</div>
                                  <span className="text-sm text-[#4A3728]">{a.user_name}</span>
                                  <Badge className={ACCESS_LEVELS.find(l => l.value === a.access_level)?.color}>{a.access_level}</Badge>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleRevokeAccess(a.id, a.user_name)}><X className="w-4 h-4 text-red-500" /></Button>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-sm text-[#8B7355] text-center py-3">No users have access</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {filteredTools.length === 0 && <div className="text-center py-8 text-[#8B7355]">No tools found</div>}
            </div>
          )}
        </TabsContent>

        {/* ====== REQUESTS TAB ====== */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowRequestDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Request Access
            </Button>
          </div>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[#F5EDE5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#4A3728]">Requester</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#4A3728]">Tool</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#4A3728]">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#4A3728]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#4A3728]">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#4A3728]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D5C4]">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-[#FDF8F3]">
                      <td className="px-4 py-3 text-sm text-[#4A3728]">{req.requester_name}</td>
                      <td className="px-4 py-3 text-sm text-[#4A3728]">{req.tool_name}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{req.requested_level}</Badge></td>
                      <td className="px-4 py-3"><Badge className={REQUEST_STATUS[req.status]?.color}>{REQUEST_STATUS[req.status]?.label}</Badge></td>
                      <td className="px-4 py-3 text-sm text-[#8B7355]">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {(req.status === 'pending' || req.status === 'manager_approved') && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedRequest(req); setActionType('approve'); setShowActionDialog(true); }}><CheckCircle className="w-4 h-4 text-emerald-600" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedRequest(req); setActionType('reject'); setShowActionDialog(true); }}><XCircle className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8B7355]">No requests</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== CREDENTIALS TAB ====== */}
        <TabsContent value="credentials" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCredDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Credential
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credentials.map(cred => (
              <Card key={cred.id} className="bg-white border-[#E8D5C4]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F5EDE5] rounded-lg flex items-center justify-center"><Lock className="w-5 h-5 text-[#4A3728]" /></div>
                      <div>
                        <h3 className="font-semibold text-[#4A3728]">{cred.tool_name}</h3>
                        <p className="text-xs text-[#8B7355]">{cred.login_email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCredential(cred)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#F5EDE5] rounded px-3 py-2 font-mono text-sm">
                        {revealedPasswords[cred.id]?.password || '••••••••••••'}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleRevealPassword(cred.id)} className="border-[#D4BBA6]">
                        {revealedPasswords[cred.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      {revealedPasswords[cred.id] && (
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(revealedPasswords[cred.id].password, 'Password')} className="border-[#D4BBA6]">
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {credentials.length === 0 && <div className="col-span-2 text-center py-8 text-[#8B7355]">No credentials stored</div>}
          </div>
        </TabsContent>

        {/* ====== AUDIT LOGS TAB ====== */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={logFilter || "all"} onValueChange={(v) => setLogFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Filter by action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="tool_created">Tool Created</SelectItem>
                <SelectItem value="access_granted">Access Granted</SelectItem>
                <SelectItem value="access_revoked">Access Revoked</SelectItem>
                <SelectItem value="credential_viewed">Credential Viewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
              <div className="divide-y divide-[#E8D5C4]">
                {filteredLogs.map((log, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-[#FDF8F3]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.action?.includes('created') || log.action?.includes('granted') ? 'bg-emerald-100' : log.action?.includes('deleted') || log.action?.includes('revoked') ? 'bg-red-100' : 'bg-blue-100'}`}>
                          <FileText className={`w-4 h-4 ${log.action?.includes('created') || log.action?.includes('granted') ? 'text-emerald-600' : log.action?.includes('deleted') || log.action?.includes('revoked') ? 'text-red-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#4A3728]">{log.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                          <p className="text-xs text-[#8B7355]">{log.user_name} • {log.entity_name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#8B7355]">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {filteredLogs.length === 0 && <div className="px-4 py-8 text-center text-[#8B7355]">No logs found</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ====== DIALOGS ====== */}
      {/* Tool Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">{editingTool ? 'Edit Tool' : 'Add Tool'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-[#4A3728]">Name *</Label><Input value={toolForm.name} onChange={(e) => setToolForm(f => ({ ...f, name: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label className="text-[#4A3728]">URL</Label><Input value={toolForm.url} onChange={(e) => setToolForm(f => ({ ...f, url: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="https://..." /></div>
            <div><Label className="text-[#4A3728]">Category</Label>
              <Select value={toolForm.category} onValueChange={(v) => setToolForm(f => ({ ...f, category: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-[#4A3728]">Description</Label><Textarea value={toolForm.description} onChange={(e) => setToolForm(f => ({ ...f, description: e.target.value }))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowToolDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleToolSubmit} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">{editingTool ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Grant Access</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-[#4A3728]">User *</Label>
              <Select value={accessForm.user_id || "placeholder"} onValueChange={(v) => setAccessForm(f => ({ ...f, user_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select user</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-[#4A3728]">Access Level</Label>
              <Select value={accessForm.access_level} onValueChange={(v) => setAccessForm(f => ({ ...f, access_level: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAccessDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleGrantAccess} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Key className="w-4 h-4 mr-2" />Grant</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Access Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Request Tool Access</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-[#4A3728]">Tool *</Label>
              <Select value={requestForm.tool_id || "placeholder"} onValueChange={(v) => setRequestForm(f => ({ ...f, tool_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select tool" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select tool</SelectItem>{tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-[#4A3728]">Access Level</Label>
              <Select value={requestForm.requested_level} onValueChange={(v) => setRequestForm(f => ({ ...f, requested_level: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-[#4A3728]">Reason</Label><Textarea value={requestForm.reason} onChange={(e) => setRequestForm(f => ({ ...f, reason: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="Why do you need access?" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRequestDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleSubmitRequest} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle className="text-[#4A3728]">{actionType === 'approve' ? 'Approve' : 'Reject'} Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedRequest && <div className="p-3 bg-[#F5EDE5] rounded"><p className="font-medium text-[#4A3728]">{selectedRequest.requester_name}</p><p className="text-sm text-[#8B7355]">Requesting {selectedRequest.requested_level} access to {selectedRequest.tool_name}</p></div>}
            <div><Label className="text-[#4A3728]">Comments</Label><Textarea value={actionComments} onChange={(e) => setActionComments(e.target.value)} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowActionDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleRequestAction} className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>{actionType === 'approve' ? 'Approve' : 'Reject'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credential Dialog */}
      <Dialog open={showCredDialog} onOpenChange={setShowCredDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Add Credential</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-[#4A3728]">Tool *</Label>
              <Select value={credForm.tool_id || "placeholder"} onValueChange={(v) => setCredForm(f => ({ ...f, tool_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select tool" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select tool</SelectItem>{tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-[#4A3728]">Login Email</Label><Input value={credForm.login_email} onChange={(e) => setCredForm(f => ({ ...f, login_email: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label className="text-[#4A3728]">Password *</Label><Input type="password" value={credForm.password} onChange={(e) => setCredForm(f => ({ ...f, password: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label className="text-[#4A3728]">Notes</Label><Textarea value={credForm.notes} onChange={(e) => setCredForm(f => ({ ...f, notes: e.target.value }))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCredDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleSaveCredential} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Shield className="w-4 h-4 mr-2" />Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ITAdminHub;
