import React, { useState, useEffect, useMemo } from 'react';
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
  UserPlus, X, Eye, EyeOff, Copy, Shield, Lock, UserX, DollarSign, 
  ArrowUpDown, ArrowUp, ArrowDown, Filter, FileText, Clock
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

const ToolsAccessTable = ({ defaultTab = 'tools' }) => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [tools, setTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Table States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [logFilter, setLogFilter] = useState('all');
  const [revealedPasswords, setRevealedPasswords] = useState({});
  
  // Dialogs
  const [showToolDialog, setShowToolDialog] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [toolForm, setToolForm] = useState({
    name: '', url: '', category: 'Other', description: '',
    subscription_type: 'free', currency: 'USD', monthly_cost: '', annual_cost: '',
    license_count: '', renewal_date: '', vendor_contact: ''
  });
  
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessToolId, setAccessToolId] = useState(null);
  const [accessForm, setAccessForm] = useState({ user_id: '', access_level: 'viewer' });
  
  const [showCredDialog, setShowCredDialog] = useState(false);
  const [credForm, setCredForm] = useState({ tool_id: '', login_email: '', password: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, usersRes, credsRes, accessRes, logsRes] = await Promise.all([
        api.get('/acms/tools?limit=100'),
        api.get('/admin/users?limit=200'),
        api.get('/acms/credentials'),
        api.get('/acms/access?limit=500'),
        api.get('/acms/audit-logs?limit=100')
      ]);
      setTools(toolsRes.data.tools || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
      setCredentials(credsRes.data.credentials || []);
      setAccessRecords(accessRes.data.access_records || []);
      setLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helpers
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
    return `${getCurrencySymbol(currency)}${parseFloat(amount).toLocaleString()}`;
  };

  // Sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-4 h-4 ml-1 text-[#8B7355]" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-[#4A3728]" />
      : <ArrowDown className="w-4 h-4 ml-1 text-[#4A3728]" />;
  };

  // Filtered Data
  const filteredTools = useMemo(() => {
    let result = [...tools];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => t.name?.toLowerCase().includes(term) || t.category?.toLowerCase().includes(term));
    }
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter);
    if (subscriptionFilter !== 'all') result = result.filter(t => t.subscription_type === subscriptionFilter);
    
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'monthly_cost' || sortConfig.key === 'license_count') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      if (sortConfig.key === 'user_count') {
        aVal = getToolAccess(a.id).length;
        bVal = getToolAccess(b.id).length;
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [tools, searchTerm, categoryFilter, subscriptionFilter, sortConfig, accessRecords]);

  const usersWithAccess = useMemo(() => {
    return users.filter(u => accessRecords.some(a => a.user_id === u.id));
  }, [users, accessRecords]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(l => l.action === logFilter);
  }, [logs, logFilter]);

  // Stats
  const totalMonthlyCost = tools.reduce((sum, t) => sum + (parseFloat(t.monthly_cost) || 0), 0);

  // CRUD Operations
  const resetToolForm = () => {
    setToolForm({ name: '', url: '', category: 'Other', description: '', subscription_type: 'free', currency: 'USD', monthly_cost: '', annual_cost: '', license_count: '', renewal_date: '', vendor_contact: '' });
    setEditingTool(null);
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
      resetToolForm();
      fetchData();
    } catch { toast.error('Failed to save tool'); }
  };

  const handleDeleteTool = async (tool) => {
    if (!confirm(`Delete "${tool.name}"?`)) return;
    try {
      await api.delete(`/acms/tools/${tool.id}`);
      toast.success('Tool deleted');
      fetchData();
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

  const handleGrantAccess = async () => {
    if (!accessForm.user_id) { toast.error('Select a user'); return; }
    try {
      await api.post('/acms/access', { tool_id: accessToolId, ...accessForm });
      toast.success('Access granted');
      setShowAccessDialog(false);
      setAccessForm({ user_id: '', access_level: 'viewer' });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleRevokeAccess = async (accessId, userName) => {
    if (!confirm(`Revoke ${userName}'s access?`)) return;
    try {
      await api.delete(`/acms/access/${accessId}`);
      toast.success('Access revoked');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleSaveCredential = async () => {
    if (!credForm.tool_id || !credForm.password) { toast.error('Tool and password required'); return; }
    try {
      await api.post('/acms/credentials', credForm);
      toast.success('Credential saved');
      setShowCredDialog(false);
      setCredForm({ tool_id: '', login_email: '', password: '', notes: '' });
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleDeleteCredential = async (cred) => {
    if (!confirm(`Delete credential for ${cred.tool_name}?`)) return;
    try {
      await api.delete(`/acms/credentials/${cred.id}`);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleRevealPassword = async (credId) => {
    if (revealedPasswords[credId]) { setRevealedPasswords(p => ({ ...p, [credId]: null })); return; }
    try {
      const res = await api.get(`/acms/credentials/${credId}?reveal_password=true`);
      setRevealedPasswords(p => ({ ...p, [credId]: res.data.password }));
    } catch { toast.error('Failed'); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="tools-access-table">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-[#8B7355] hover:text-[#4A3728]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#4A3728]">Tools & Access</h1>
          <p className="text-[#8B7355]">Manage tools, credentials, users and audit logs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
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
            <div><p className="text-xl font-bold text-amber-600">{usersWithAccess.length}</p><p className="text-xs text-[#8B7355]">Users</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-[#E8D5C4] p-1">
          <TabsTrigger value="tools" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Package className="w-4 h-4 mr-2" /> Tools
          </TabsTrigger>
          <TabsTrigger value="credentials" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Lock className="w-4 h-4 mr-2" /> Credentials
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" /> Users
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" /> Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* ========== TOOLS TAB ========== */}
        <TabsContent value="tools" className="space-y-4">
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
                  <Input placeholder="Search tools..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-[#D4BBA6]" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                  <SelectTrigger className="w-[150px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Subscription" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Types</SelectItem>{SUBSCRIPTION_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={() => { resetToolForm(); setShowToolDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Tool
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead className="cursor-pointer" onClick={() => handleSort('name')}><div className="flex items-center">Tool <SortIcon column="name" /></div></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('category')}><div className="flex items-center">Category <SortIcon column="category" /></div></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('subscription_type')}><div className="flex items-center">Subscription <SortIcon column="subscription_type" /></div></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('monthly_cost')}><div className="flex items-center">Monthly Cost <SortIcon column="monthly_cost" /></div></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('license_count')}><div className="flex items-center">Licenses <SortIcon column="license_count" /></div></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('user_count')}><div className="flex items-center">Users <SortIcon column="user_count" /></div></TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-[#8B7355]">Loading...</TableCell></TableRow> :
                  filteredTools.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-[#8B7355]">No tools found</TableCell></TableRow> :
                  filteredTools.map(tool => {
                    const toolAccess = getToolAccess(tool.id);
                    const subType = SUBSCRIPTION_TYPES.find(s => s.value === tool.subscription_type);
                    return (
                      <TableRow key={tool.id} className="hover:bg-[#FDF8F3]">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-[#8B7355]" />
                            <div>
                              <p className="font-medium text-[#4A3728]">{tool.name}</p>
                              {tool.url && <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline"><ExternalLink className="w-3 h-3 inline mr-1" />Website</a>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{tool.category || 'Other'}</Badge></TableCell>
                        <TableCell>{subType && <Badge className={subType.color}>{subType.label}</Badge>}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(tool.monthly_cost, tool.currency)}</TableCell>
                        <TableCell>{tool.license_count || '-'}</TableCell>
                        <TableCell><Badge variant="outline"><Users className="w-3 h-3 mr-1" />{toolAccess.length}</Badge></TableCell>
                        <TableCell className="text-sm text-[#8B7355]">{tool.renewal_date ? new Date(tool.renewal_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setAccessToolId(tool.id); setShowAccessDialog(true); }}><UserPlus className="w-4 h-4 text-emerald-600" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditTool(tool)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTool(tool)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== CREDENTIALS TAB ========== */}
        <TabsContent value="credentials" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCredDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Credential
            </Button>
          </div>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead>Tool</TableHead>
                    <TableHead>Login Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#8B7355]">No credentials stored</TableCell></TableRow> :
                  credentials.map(cred => (
                    <TableRow key={cred.id} className="hover:bg-[#FDF8F3]">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-[#4A3728]">{cred.tool_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#8B7355]">{cred.login_email || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-[#F5EDE5] px-2 py-1 rounded text-sm">{revealedPasswords[cred.id] || '••••••••'}</code>
                          <Button variant="ghost" size="sm" onClick={() => handleRevealPassword(cred.id)}>
                            {revealedPasswords[cred.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          {revealedPasswords[cred.id] && <Button variant="ghost" size="sm" onClick={() => copyToClipboard(revealedPasswords[cred.id])}><Copy className="w-4 h-4" /></Button>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#8B7355] max-w-[200px] truncate">{cred.notes || '-'}</TableCell>
                      <TableCell className="text-sm text-[#8B7355]">{cred.created_at ? new Date(cred.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCredential(cred)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== USERS TAB ========== */}
        <TabsContent value="users" className="space-y-4">
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tools Access</TableHead>
                    <TableHead>Access Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithAccess.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#8B7355]">No users with tool access</TableCell></TableRow> :
                  usersWithAccess.map(user => {
                    const userTools = getUserTools(user.id);
                    return (
                      <TableRow key={user.id} className="hover:bg-[#FDF8F3]">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#D4BBA6] rounded-full flex items-center justify-center text-white text-sm">{user.name?.charAt(0)}</div>
                            <span className="font-medium text-[#4A3728]">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#8B7355]">{user.email}</TableCell>
                        <TableCell><Badge variant="outline"><Key className="w-3 h-3 mr-1" />{userTools.length} tools</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userTools.slice(0, 3).map(t => (
                              <Badge key={t.id} variant="secondary" className="text-xs">
                                {t.tool_name} ({t.access_level})
                              </Badge>
                            ))}
                            {userTools.length > 3 && <Badge variant="outline" className="text-xs">+{userTools.length - 3} more</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {userTools.map(t => (
                              <Button key={t.id} variant="ghost" size="sm" onClick={() => handleRevokeAccess(t.id, user.name)} title={`Revoke ${t.tool_name}`}>
                                <UserX className="w-4 h-4 text-red-500" />
                              </Button>
                            )).slice(0, 2)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== AUDIT LOGS TAB ========== */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <Select value={logFilter} onValueChange={setLogFilter}>
                <SelectTrigger className="w-[200px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Filter by action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="tool_created">Tool Created</SelectItem>
                  <SelectItem value="tool_updated">Tool Updated</SelectItem>
                  <SelectItem value="access_granted">Access Granted</SelectItem>
                  <SelectItem value="access_revoked">Access Revoked</SelectItem>
                  <SelectItem value="credential_created">Credential Created</SelectItem>
                  <SelectItem value="credential_viewed">Credential Viewed</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#8B7355]">No logs found</TableCell></TableRow> :
                  filteredLogs.map((log, i) => (
                    <TableRow key={i} className="hover:bg-[#FDF8F3]">
                      <TableCell>
                        <Badge className={
                          log.action?.includes('created') || log.action?.includes('granted') ? 'bg-emerald-100 text-emerald-700' :
                          log.action?.includes('deleted') || log.action?.includes('revoked') ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }>{log.action?.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-[#4A3728]">{log.user_name || '-'}</TableCell>
                      <TableCell className="text-[#8B7355]">{log.entity_name || '-'}</TableCell>
                      <TableCell className="text-sm text-[#8B7355] max-w-[200px] truncate">{typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '-')}</TableCell>
                      <TableCell className="text-sm text-[#8B7355]">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========== DIALOGS ========== */}
      
      {/* Tool Dialog */}
      <Dialog open={showToolDialog} onOpenChange={setShowToolDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#4A3728]">{editingTool ? 'Edit Tool' : 'Add Tool'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name *</Label><Input value={toolForm.name} onChange={(e) => setToolForm(f => ({ ...f, name: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div className="col-span-2"><Label>URL</Label><Input value={toolForm.url} onChange={(e) => setToolForm(f => ({ ...f, url: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Category</Label><Select value={toolForm.category} onValueChange={(v) => setToolForm(f => ({ ...f, category: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Subscription</Label><Select value={toolForm.subscription_type} onValueChange={(v) => setToolForm(f => ({ ...f, subscription_type: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{SUBSCRIPTION_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Currency</Label><Select value={toolForm.currency} onValueChange={(v) => setToolForm(f => ({ ...f, currency: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Monthly Cost</Label><Input type="number" value={toolForm.monthly_cost} onChange={(e) => setToolForm(f => ({ ...f, monthly_cost: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Annual Cost</Label><Input type="number" value={toolForm.annual_cost} onChange={(e) => setToolForm(f => ({ ...f, annual_cost: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Licenses</Label><Input type="number" value={toolForm.license_count} onChange={(e) => setToolForm(f => ({ ...f, license_count: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Renewal Date</Label><Input type="date" value={toolForm.renewal_date} onChange={(e) => setToolForm(f => ({ ...f, renewal_date: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div className="col-span-2"><Label>Vendor Contact</Label><Input value={toolForm.vendor_contact} onChange={(e) => setToolForm(f => ({ ...f, vendor_contact: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowToolDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleToolSubmit} className="bg-[#4A3728] text-white">{editingTool ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Grant Access</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>User *</Label><Select value={accessForm.user_id || "placeholder"} onValueChange={(v) => setAccessForm(f => ({ ...f, user_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select user</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Access Level</Label><Select value={accessForm.access_level} onValueChange={(v) => setAccessForm(f => ({ ...f, access_level: v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger><SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAccessDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleGrantAccess} className="bg-[#4A3728] text-white"><Key className="w-4 h-4 mr-2" />Grant</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credential Dialog */}
      <Dialog open={showCredDialog} onOpenChange={setShowCredDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Add Credential</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tool *</Label><Select value={credForm.tool_id || "placeholder"} onValueChange={(v) => setCredForm(f => ({ ...f, tool_id: v === "placeholder" ? "" : v }))}><SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select tool" /></SelectTrigger><SelectContent><SelectItem value="placeholder" disabled>Select tool</SelectItem>{tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Login Email</Label><Input value={credForm.login_email} onChange={(e) => setCredForm(f => ({ ...f, login_email: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Password *</Label><Input type="password" value={credForm.password} onChange={(e) => setCredForm(f => ({ ...f, password: e.target.value }))} className="bg-white border-[#D4BBA6]" /></div>
            <div><Label>Notes</Label><Textarea value={credForm.notes} onChange={(e) => setCredForm(f => ({ ...f, notes: e.target.value }))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCredDialog(false)} className="border-[#D4BBA6]">Cancel</Button><Button onClick={handleSaveCredential} className="bg-[#4A3728] text-white"><Shield className="w-4 h-4 mr-2" />Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToolsAccessTable;
