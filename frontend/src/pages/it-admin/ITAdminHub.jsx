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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Search, Package, Users, Key, ExternalLink, Edit, Trash2,
  UserPlus, X, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Eye, EyeOff,
  Copy, Shield, FileText, Lock, UserX, DollarSign, Calendar, CreditCard
} from 'lucide-react';

const CATEGORIES = ['Marketing', 'Design', 'Development', 'Finance', 'HR', 'Sales', 'Operations', 'Communication', 'Analytics', 'Security', 'Other'];
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'SGD', label: 'SGD (S$)', symbol: 'S$' }
];
const SUBSCRIPTION_TYPES = [
  { value: 'free', label: 'Free', color: 'bg-green-100 text-green-700' },
  { value: 'monthly', label: 'Monthly', color: 'bg-blue-100 text-blue-700' },
  { value: 'annual', label: 'Annual', color: 'bg-purple-100 text-purple-700' },
  { value: 'one_time', label: 'One-time', color: 'bg-amber-100 text-amber-700' },
  { value: 'enterprise', label: 'Enterprise', color: 'bg-red-100 text-red-700' }
];
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

const ITAdminHub = ({ defaultTab = 'tools' }) => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [tools, setTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTool, setExpandedTool] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [credViewMode, setCredViewMode] = useState('by-tool');
  const [logFilter, setLogFilter] = useState('');
  
  // Tool Dialog
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [toolForm, setToolForm] = useState({
    name: '', url: '', category: 'Other', description: '',
    subscription_type: 'free', currency: 'USD', monthly_cost: '', annual_cost: '',
    license_count: '', renewal_date: '', vendor_contact: ''
  });
  
  // Access Dialog
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessToolId, setAccessToolId] = useState(null);
  const [accessForm, setAccessForm] = useState({ user_id: '', access_level: 'viewer' });
  
  // Credential Dialog
  const [showCredDialog, setShowCredDialog] = useState(false);
  const [credForm, setCredForm] = useState({ tool_id: '', login_email: '', password: '', notes: '' });
  
  // Request Dialogs
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState({ tool_id: '', reason: '', requested_level: 'viewer' });
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionComments, setActionComments] = useState('');

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const [toolsRes, usersRes, credsRes, accessRes, requestsRes, logsRes] = await Promise.all([
        api.get('/acms/tools?limit=100'),
        api.get('/admin/users?limit=200'),
        api.get('/acms/credentials'),
        api.get('/acms/access?limit=500'),
        api.get('/acms/requests?limit=100'),
        api.get('/acms/audit-logs?limit=50')
      ]);
      setTools(toolsRes.data.tools || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
      setCredentials(credsRes.data.credentials || []);
      setAccessRecords(accessRes.data.access_records || []);
      setRequests(requestsRes.data.requests || []);
      setLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getToolAccess = (toolId) => accessRecords.filter(a => a.tool_id === toolId);
  const getToolCredentials = (toolId) => credentials.filter(c => c.tool_id === toolId);
  const getUserTools = (userId) => {
    return accessRecords.filter(a => a.user_id === userId).map(access => {
      const tool = tools.find(t => t.id === access.tool_id);
      return { ...access, tool_name: tool?.name || 'Unknown', tool_category: tool?.category };
    });
  };
  const getCurrencySymbol = (code) => CURRENCIES.find(c => c.value === code)?.symbol || '$';
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return '-';
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${parseFloat(amount).toLocaleString()}`;
  };
  const totalMonthlyCost = tools.reduce((sum, t) => sum + (parseFloat(t.monthly_cost) || 0), 0);

  // Tool CRUD
  const handleToolSubmit = async () => {
    if (!toolForm.name) { toast.error('Name is required'); return; }
    try {
      const payload = { ...toolForm };
      if (editingTool) {
        await api.put(`/acms/tools/${editingTool.id}`, payload);
        toast.success('Tool updated');
      } else {
        await api.post('/acms/tools', payload);
        toast.success('Tool added');
      }
      setShowToolDialog(false);
      resetToolForm();
      fetchAllData();
    } catch { toast.error('Failed to save tool'); }
  };

  const resetToolForm = () => {
    setToolForm({ name: '', url: '', category: 'Other', description: '', subscription_type: 'free', currency: 'USD', monthly_cost: '', annual_cost: '', license_count: '', renewal_date: '', vendor_contact: '' });
    setEditingTool(null);
  };

  const handleDeleteTool = async (tool) => {
    if (!confirm(`Delete "${tool.name}"?`)) return;
    try {
      await api.delete(`/acms/tools/${tool.id}`);
      toast.success('Tool deleted');
      fetchAllData();
    } catch { toast.error('Failed to delete'); }
  };

  const openEditTool = (tool) => {
    setEditingTool(tool);
    setToolForm({
      name: tool.name || '', url: tool.url || '', category: tool.category || 'Other',
      description: tool.description || '', subscription_type: tool.subscription_type || 'free',
      currency: tool.currency || 'USD', monthly_cost: tool.monthly_cost || '', annual_cost: tool.annual_cost || '',
      license_count: tool.license_count || '', renewal_date: tool.renewal_date || '',
      vendor_contact: tool.vendor_contact || ''
    });
    setShowToolDialog(true);
  };

  // Access CRUD
  const handleGrantAccess = async () => {
    if (!accessForm.user_id) { toast.error('Select a user'); return; }
    try {
      await api.post('/acms/access', { tool_id: accessToolId, ...accessForm });
      toast.success('Access granted');
      setShowAccessDialog(false);
      setAccessForm({ user_id: '', access_level: 'viewer' });
      fetchAllData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleRevokeAccess = async (accessId, userName, toolName) => {
    if (!confirm(`Revoke ${userName}'s access to ${toolName}?`)) return;
    try {
      await api.delete(`/acms/access/${accessId}`);
      toast.success('Access revoked');
      fetchAllData();
    } catch { toast.error('Failed'); }
  };

  // Credential CRUD
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
    if (!confirm(`Delete credential for ${cred.tool_name}?`)) return;
    try {
      await api.delete(`/acms/credentials/${cred.id}`);
      toast.success('Deleted');
      fetchAllData();
    } catch { toast.error('Failed'); }
  };

  const handleRevealPassword = async (credId) => {
    if (revealedPasswords[credId]) { setRevealedPasswords(p => ({ ...p, [credId]: null })); return; }
    try {
      const res = await api.get(`/acms/credentials/${credId}?reveal_password=true`);
      setRevealedPasswords(p => ({ ...p, [credId]: { password: res.data.password } }));
      toast.success('Password revealed');
    } catch { toast.error('Failed'); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  // Request handlers
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
      const endpoint = selectedRequest.status === 'pending' ? `/acms/requests/${selectedRequest.id}/manager-action` : `/acms/requests/${selectedRequest.id}/admin-action`;
      await api.post(endpoint, { action: actionType, comments: actionComments });
      toast.success(`Request ${actionType}d`);
      setShowActionDialog(false);
      setSelectedRequest(null);
      setActionComments('');
      fetchAllData();
    } catch { toast.error('Failed'); }
  };

  // Filtered data
  const filteredTools = tools.filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const usersWithAccess = users.filter(u => accessRecords.some(a => a.user_id === u.id));
  const filteredUsers = usersWithAccess.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLogs = logs.filter(l => !logFilter || l.action === logFilter);
  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'manager_approved');

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="it-admin-hub">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-[#8B7355] hover:text-[#4A3728]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#4A3728]">IT Administration</h1>
          <p className="text-[#8B7355]">Manage tools, credentials, access & audit logs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-3 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div><p className="text-xl font-bold text-blue-600">{tools.length}</p><p className="text-xs text-[#8B7355]">Tools</p></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-3 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <div><p className="text-xl font-bold text-emerald-600">${totalMonthlyCost.toLocaleString()}</p><p className="text-xs text-[#8B7355]">Monthly Cost</p></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-3 flex items-center gap-3">
            <Lock className="w-8 h-8 text-purple-600" />
            <div><p className="text-xl font-bold text-purple-600">{credentials.length}</p><p className="text-xs text-[#8B7355]">Credentials</p></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-600" />
            <div><p className="text-xl font-bold text-amber-600">{usersWithAccess.length}</p><p className="text-xs text-[#8B7355]">Users with Access</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-[#E8D5C4] p-1">
          <TabsTrigger value="tools" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Package className="w-4 h-4 mr-2" /> Tools & Access
          </TabsTrigger>
          <TabsTrigger value="credentials" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Lock className="w-4 h-4 mr-2" /> Credentials
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Clock className="w-4 h-4 mr-2" /> Requests
            {pendingRequests.length > 0 && <Badge className="ml-2 bg-amber-500 text-white">{pendingRequests.length}</Badge>}
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
            <Button onClick={() => { resetToolForm(); setShowToolDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Tool
            </Button>
          </div>

          {loading ? <div className="text-center py-8 text-[#8B7355]">Loading...</div> : (
            <div className="space-y-2">
              {filteredTools.map(tool => {
                const toolAccess = getToolAccess(tool.id);
                const isExpanded = expandedTool === tool.id;
                const subType = SUBSCRIPTION_TYPES.find(s => s.value === tool.subscription_type);
                
                return (
                  <Card key={tool.id} className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpandedTool(isExpanded ? null : tool.id)}>
                          <div className="w-10 h-10 bg-[#F5EDE5] rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#4A3728]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[#4A3728]">{tool.name}</h3>
                              <Badge variant="outline" className="text-xs">{tool.category || 'Other'}</Badge>
                              {subType && <Badge className={`text-xs ${subType.color}`}>{subType.label}</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-[#8B7355] mt-1">
                              <span><Users className="w-3 h-3 inline mr-1" />{toolAccess.length} users</span>
                              {tool.monthly_cost && <span><DollarSign className="w-3 h-3 inline" />{formatCurrency(tool.monthly_cost, tool.currency)}/mo</span>}
                              {tool.license_count && <span><Key className="w-3 h-3 inline mr-1" />{tool.license_count} licenses</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {tool.url && <a href={tool.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-[#F5EDE5] rounded"><ExternalLink className="w-4 h-4 text-blue-600" /></a>}
                          <Button variant="ghost" size="sm" onClick={() => { setAccessToolId(tool.id); setShowAccessDialog(true); }}><UserPlus className="w-4 h-4 text-emerald-600" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditTool(tool)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTool(tool)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setExpandedTool(isExpanded ? null : tool.id)}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[#E8D5C4] grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Tool Details */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-[#4A3728] flex items-center gap-2"><CreditCard className="w-4 h-4" /> Subscription Details</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-[#F5EDE5] p-2 rounded">
                                <p className="text-xs text-[#8B7355]">Monthly Cost</p>
                                <p className="font-medium text-[#4A3728]">{formatCurrency(tool.monthly_cost, tool.currency)}</p>
                              </div>
                              <div className="bg-[#F5EDE5] p-2 rounded">
                                <p className="text-xs text-[#8B7355]">Annual Cost</p>
                                <p className="font-medium text-[#4A3728]">{formatCurrency(tool.annual_cost, tool.currency)}</p>
                              </div>
                              <div className="bg-[#F5EDE5] p-2 rounded">
                                <p className="text-xs text-[#8B7355]">Licenses</p>
                                <p className="font-medium text-[#4A3728]">{tool.license_count || '-'}</p>
                              </div>
                              <div className="bg-[#F5EDE5] p-2 rounded">
                                <p className="text-xs text-[#8B7355]">Renewal Date</p>
                                <p className="font-medium text-[#4A3728]">{tool.renewal_date ? new Date(tool.renewal_date).toLocaleDateString() : '-'}</p>
                              </div>
                            </div>
                            {tool.vendor_contact && <p className="text-xs text-[#8B7355]">Contact: {tool.vendor_contact}</p>}
                          </div>
                          
                          {/* User Access */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-[#4A3728] flex items-center gap-2"><Users className="w-4 h-4" /> User Access</h4>
                              <Button size="sm" variant="outline" onClick={() => { setAccessToolId(tool.id); setShowAccessDialog(true); }} className="text-xs border-[#D4BBA6]"><UserPlus className="w-3 h-3 mr-1" /> Add</Button>
                            </div>
                            {toolAccess.length > 0 ? (
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {toolAccess.map(a => (
                                  <div key={a.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 bg-[#D4BBA6] rounded-full flex items-center justify-center text-white text-xs">{a.user_name?.charAt(0)}</div>
                                      <span className="text-[#4A3728]">{a.user_name}</span>
                                      <Badge className={ACCESS_LEVELS.find(l => l.value === a.access_level)?.color || ''} variant="secondary">{a.access_level}</Badge>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleRevokeAccess(a.id, a.user_name, tool.name)}><UserX className="w-3 h-3 text-red-500" /></Button>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-xs text-[#8B7355] py-2">No users have access</p>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {filteredTools.length === 0 && <div className="text-center py-8 text-[#8B7355]">No tools found</div>}
            </div>
          )}
        </TabsContent>

        {/* ====== CREDENTIALS TAB ====== */}
        <TabsContent value="credentials" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant={credViewMode === 'by-tool' ? 'default' : 'outline'} size="sm" onClick={() => setCredViewMode('by-tool')} className={credViewMode === 'by-tool' ? 'bg-[#4A3728]' : 'border-[#D4BBA6]'}>
                <Package className="w-4 h-4 mr-1" /> By Tool
              </Button>
              <Button variant={credViewMode === 'by-user' ? 'default' : 'outline'} size="sm" onClick={() => setCredViewMode('by-user')} className={credViewMode === 'by-user' ? 'bg-[#4A3728]' : 'border-[#D4BBA6]'}>
                <Users className="w-4 h-4 mr-1" /> By User
              </Button>
            </div>
            <Button onClick={() => setShowCredDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Credential
            </Button>
          </div>

          {credViewMode === 'by-tool' ? (
            <div className="space-y-2">
              {filteredTools.map(tool => {
                const toolCreds = getToolCredentials(tool.id);
                const toolAccess = getToolAccess(tool.id);
                const isExpanded = expandedTool === tool.id;
                return (
                  <Card key={tool.id} className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedTool(isExpanded ? null : tool.id)}>
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-[#4A3728]" />
                          <div>
                            <h3 className="font-semibold text-[#4A3728]">{tool.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-[#8B7355]">
                              <span><Lock className="w-3 h-3 inline mr-1" />{toolCreds.length} credentials</span>
                              <span><Users className="w-3 h-3 inline mr-1" />{toolAccess.length} users</span>
                            </div>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[#E8D5C4] grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-[#4A3728] mb-2"><Lock className="w-4 h-4 inline mr-1" />Credentials</h4>
                            {toolCreds.length > 0 ? toolCreds.map(cred => (
                              <div key={cred.id} className="p-2 bg-[#F5EDE5] rounded mb-2">
                                <p className="text-sm font-medium text-[#4A3728]">{cred.login_email || 'No email'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="text-xs bg-white px-2 py-1 rounded flex-1">{revealedPasswords[cred.id]?.password || '••••••••'}</code>
                                  <Button variant="ghost" size="sm" onClick={() => handleRevealPassword(cred.id)}>{revealedPasswords[cred.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</Button>
                                  {revealedPasswords[cred.id] && <Button variant="ghost" size="sm" onClick={() => copyToClipboard(revealedPasswords[cred.id].password)}><Copy className="w-3 h-3" /></Button>}
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCredential(cred)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                                </div>
                              </div>
                            )) : <p className="text-xs text-[#8B7355]">No credentials</p>}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-[#4A3728] mb-2"><Users className="w-4 h-4 inline mr-1" />Users with Access</h4>
                            {toolAccess.length > 0 ? toolAccess.map(a => (
                              <div key={a.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-[#4A3728]">{a.user_name}</span>
                                  <Badge className={ACCESS_LEVELS.find(l => l.value === a.access_level)?.color}>{a.access_level}</Badge>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleRevokeAccess(a.id, a.user_name, tool.name)}><UserX className="w-3 h-3 text-red-500" /></Button>
                              </div>
                            )) : <p className="text-xs text-[#8B7355]">No users</p>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(user => {
                const userTools = getUserTools(user.id);
                const isExpanded = expandedUser === user.id;
                return (
                  <Card key={user.id} className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedUser(isExpanded ? null : user.id)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#D4BBA6] rounded-full flex items-center justify-center text-white font-medium">{user.name?.charAt(0)}</div>
                          <div>
                            <h3 className="font-semibold text-[#4A3728]">{user.name}</h3>
                            <p className="text-xs text-[#8B7355]">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline"><Key className="w-3 h-3 mr-1" />{userTools.length} tools</Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                      {isExpanded && userTools.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#E8D5C4]">
                          <Table>
                            <TableHeader><TableRow className="bg-[#F5EDE5]">
                              <TableHead>Tool</TableHead><TableHead>Access</TableHead><TableHead>Granted</TableHead><TableHead className="text-right">Actions</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {userTools.map(a => (
                                <TableRow key={a.id}>
                                  <TableCell className="font-medium">{a.tool_name}</TableCell>
                                  <TableCell><Badge className={ACCESS_LEVELS.find(l => l.value === a.access_level)?.color}>{a.access_level}</Badge></TableCell>
                                  <TableCell className="text-sm text-[#8B7355]">{a.granted_at ? new Date(a.granted_at).toLocaleDateString() : '-'}</TableCell>
                                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleRevokeAccess(a.id, user.name, a.tool_name)} className="text-red-500"><UserX className="w-4 h-4 mr-1" />Revoke</Button></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {filteredUsers.length === 0 && <div className="text-center py-8 text-[#8B7355]">No users with access</div>}
            </div>
          )}
        </TabsContent>

        {/* ====== REQUESTS TAB ====== */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowRequestDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Plus className="w-4 h-4 mr-2" /> Request Access</Button>
          </div>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-[#F5EDE5]">
                  <TableHead>Requester</TableHead><TableHead>Tool</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>{req.requester_name}</TableCell>
                      <TableCell>{req.tool_name}</TableCell>
                      <TableCell><Badge variant="outline">{req.requested_level}</Badge></TableCell>
                      <TableCell><Badge className={REQUEST_STATUS[req.status]?.color}>{REQUEST_STATUS[req.status]?.label}</Badge></TableCell>
                      <TableCell className="text-sm text-[#8B7355]">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {(req.status === 'pending' || req.status === 'manager_approved') && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedRequest(req); setActionType('approve'); setShowActionDialog(true); }}><CheckCircle className="w-4 h-4 text-emerald-600" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedRequest(req); setActionType('reject'); setShowActionDialog(true); }}><XCircle className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#8B7355]">No requests</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== AUDIT LOGS TAB ====== */}
        <TabsContent value="logs" className="space-y-4">
          <Select value={logFilter || "all"} onValueChange={(v) => setLogFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="tool_created">Tool Created</SelectItem>
              <SelectItem value="access_granted">Access Granted</SelectItem>
              <SelectItem value="access_revoked">Access Revoked</SelectItem>
              <SelectItem value="credential_viewed">Credential Viewed</SelectItem>
            </SelectContent>
          </Select>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0 max-h-[500px] overflow-y-auto divide-y divide-[#E8D5C4]">
              {filteredLogs.map((log, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#FDF8F3] flex items-center justify-between">
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
              ))}
              {filteredLogs.length === 0 && <div className="px-4 py-8 text-center text-[#8B7355]">No logs</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ====== DIALOGS ====== */}
      {/* Tool Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#4A3728]">{editingTool ? 'Edit Tool' : 'Add Tool'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name *</Label><Input value={toolForm.name} onChange={(e) => setToolForm(f => ({ ...f, name: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div className="col-span-2"><Label>URL</Label><Input value={toolForm.url} onChange={(e) => setToolForm(f => ({ ...f, url: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="https://..." /></div>
            <div><Label>Category</Label>
              <Select value={toolForm.category} onValueChange={(v) => setToolForm(f => ({ ...f, category: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Subscription Type</Label>
              <Select value={toolForm.subscription_type} onValueChange={(v) => setToolForm(f => ({ ...f, subscription_type: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{SUBSCRIPTION_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Currency</Label>
              <Select value={toolForm.currency} onValueChange={(v) => setToolForm(f => ({ ...f, currency: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Monthly Cost</Label><Input type="number" value={toolForm.monthly_cost} onChange={(e) => setToolForm(f => ({ ...f, monthly_cost: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Annual Cost</Label><Input type="number" value={toolForm.annual_cost} onChange={(e) => setToolForm(f => ({ ...f, annual_cost: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>License Count</Label><Input type="number" value={toolForm.license_count} onChange={(e) => setToolForm(f => ({ ...f, license_count: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Renewal Date</Label><Input type="date" value={toolForm.renewal_date} onChange={(e) => setToolForm(f => ({ ...f, renewal_date: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div className="col-span-2"><Label>Vendor Contact</Label><Input value={toolForm.vendor_contact} onChange={(e) => setToolForm(f => ({ ...f, vendor_contact: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="support@vendor.com" /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={toolForm.description} onChange={(e) => setToolForm(f => ({ ...f, description: e.target.value }))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowToolDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleToolSubmit} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">{editingTool ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Grant Access</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>User *</Label>
              <Select value={accessForm.user_id || "placeholder"} onValueChange={(v) => setAccessForm(f => ({ ...f, user_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select user</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Access Level</Label>
              <Select value={accessForm.access_level} onValueChange={(v) => setAccessForm(f => ({ ...f, access_level: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAccessDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleGrantAccess} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Key className="w-4 h-4 mr-2" />Grant</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credential Dialog */}
      <Dialog open={showCredDialog} onOpenChange={setShowCredDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Add Credential</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tool *</Label>
              <Select value={credForm.tool_id || "placeholder"} onValueChange={(v) => setCredForm(f => ({ ...f, tool_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select tool" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select tool</SelectItem>{tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Login Email</Label><Input value={credForm.login_email} onChange={(e) => setCredForm(f => ({ ...f, login_email: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Password *</Label><Input type="password" value={credForm.password} onChange={(e) => setCredForm(f => ({ ...f, password: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Notes</Label><Textarea value={credForm.notes} onChange={(e) => setCredForm(f => ({ ...f, notes: e.target.value }))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCredDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleSaveCredential} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Shield className="w-4 h-4 mr-2" />Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Access Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Request Tool Access</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tool *</Label>
              <Select value={requestForm.tool_id || "placeholder"} onValueChange={(v) => setRequestForm(f => ({ ...f, tool_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select tool" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select tool</SelectItem>{tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Access Level</Label>
              <Select value={requestForm.requested_level} onValueChange={(v) => setRequestForm(f => ({ ...f, requested_level: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Reason</Label><Textarea value={requestForm.reason} onChange={(e) => setRequestForm(f => ({ ...f, reason: e.target.value }))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRequestDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleSubmitRequest} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle className="text-[#4A3728]">{actionType === 'approve' ? 'Approve' : 'Reject'} Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedRequest && <div className="p-3 bg-[#F5EDE5] rounded"><p className="font-medium text-[#4A3728]">{selectedRequest.requester_name}</p><p className="text-sm text-[#8B7355]">Requesting {selectedRequest.requested_level} access to {selectedRequest.tool_name}</p></div>}
            <div><Label>Comments</Label><Textarea value={actionComments} onChange={(e) => setActionComments(e.target.value)} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowActionDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleRequestAction} className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>{actionType === 'approve' ? 'Approve' : 'Reject'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ITAdminHub;
