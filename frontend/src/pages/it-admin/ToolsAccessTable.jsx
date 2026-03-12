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
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Search, Package, Users, Key, ExternalLink, Edit, Trash2,
  UserPlus, X, Eye, EyeOff, Copy, Shield, Lock, UserX, DollarSign, 
  ArrowUpDown, ArrowUp, ArrowDown, Filter, FileText, Clock, Settings2, Zap, CheckCircle2
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
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  
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
  const [editingCred, setEditingCred] = useState(null);
  const [credForm, setCredForm] = useState({ tool_id: '', login_email: '', password: '', notes: '' });
  
  // Credential History Dialog
  const [showCredHistoryDialog, setShowCredHistoryDialog] = useState(false);
  const [credHistory, setCredHistory] = useState([]);
  
  // Template Dialog
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    department_id: '',
    role_code: '',
    tool_ids: [],
    default_access_level: 'viewer',
    is_active: true
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, usersRes, credsRes, accessRes, logsRes, templatesRes, deptsRes] = await Promise.all([
        api.get('/acms/tools?limit=100'),
        api.get('/admin/users?limit=200'),
        api.get('/acms/credentials'),
        api.get('/acms/access?limit=500'),
        api.get('/acms/audit-logs?limit=100'),
        api.get('/acms/templates').catch(() => ({ data: { templates: [] } })),
        api.get('/hr/departments').catch(() => ({ data: [] }))
      ]);
      setTools(toolsRes.data.tools || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
      setCredentials(credsRes.data.credentials || []);
      setAccessRecords(accessRes.data.access_records || []);
      setLogs(logsRes.data.logs || []);
      setTemplates(templatesRes.data.templates || []);
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
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
    let result = users.filter(u => accessRecords.some(a => a.user_id === u.id));
    // Apply search filter for users tab
    if (searchTerm && activeTab === 'users') {
      const term = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name?.toLowerCase().includes(term) || 
        u.email?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [users, accessRecords, searchTerm, activeTab]);

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
    if (!credForm.tool_id || (!editingCred && !credForm.password)) { 
      toast.error('Tool and password required'); 
      return; 
    }
    try {
      if (editingCred) {
        // Update existing credential
        const updateData = { ...credForm };
        if (!updateData.password) delete updateData.password; // Don't send empty password
        await api.put(`/acms/credentials/${editingCred.id}`, updateData);
        toast.success('Credential updated');
      } else {
        // Create new credential
        await api.post('/acms/credentials', credForm);
        toast.success('Credential saved');
      }
      setShowCredDialog(false);
      setEditingCred(null);
      setCredForm({ tool_id: '', login_email: '', password: '', notes: '' });
      fetchData();
    } catch { toast.error('Failed to save credential'); }
  };

  const openEditCredential = (cred) => {
    setEditingCred(cred);
    setCredForm({
      tool_id: cred.tool_id || '',
      login_email: cred.login_email || '',
      password: '', // Don't pre-fill password for security
      notes: cred.notes || ''
    });
    setShowCredDialog(true);
  };

  const resetCredForm = () => {
    setEditingCred(null);
    setCredForm({ tool_id: '', login_email: '', password: '', notes: '' });
  };

  const viewCredentialHistory = async (cred) => {
    try {
      // Filter logs for this credential
      const credLogs = logs.filter(l => 
        l.entity_id === cred.id || 
        (l.entity_name && l.entity_name.includes(cred.tool_name))
      );
      setCredHistory(credLogs);
      setShowCredHistoryDialog(true);
    } catch { toast.error('Failed to load history'); }
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

  // ========== TEMPLATE CRUD ==========
  const resetTemplateForm = () => {
    setTemplateForm({
      name: '', description: '', department_id: '', role_code: '',
      tool_ids: [], default_access_level: 'viewer', is_active: true
    });
    setEditingTemplate(null);
  };

  const handleTemplateSubmit = async () => {
    if (!templateForm.name) { toast.error('Template name is required'); return; }
    if (templateForm.tool_ids.length === 0) { toast.error('Select at least one tool'); return; }
    
    try {
      const payload = {
        ...templateForm,
        department_id: templateForm.department_id || null,
        role_code: templateForm.role_code || null
      };
      
      if (editingTemplate) {
        await api.put(`/acms/templates/${editingTemplate.id}`, payload);
        toast.success('Template updated');
      } else {
        await api.post('/acms/templates', payload);
        toast.success('Template created');
      }
      setShowTemplateDialog(false);
      resetTemplateForm();
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save template'); }
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name || '',
      description: template.description || '',
      department_id: template.department_id || '',
      role_code: template.role_code || '',
      tool_ids: template.tool_ids || [],
      default_access_level: template.default_access_level || 'viewer',
      is_active: template.is_active !== false
    });
    setShowTemplateDialog(true);
  };

  const handleDeleteTemplate = async (template) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      await api.delete(`/acms/templates/${template.id}`);
      toast.success('Template deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const toggleToolInTemplate = (toolId) => {
    setTemplateForm(f => ({
      ...f,
      tool_ids: f.tool_ids.includes(toolId)
        ? f.tool_ids.filter(id => id !== toolId)
        : [...f.tool_ids, toolId]
    }));
  };

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
      <div className="grid grid-cols-5 gap-4">
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
            <Zap className="w-8 h-8 text-orange-600" />
            <div><p className="text-xl font-bold text-orange-600">{templates.filter(t => t.is_active !== false).length}</p><p className="text-xs text-[#8B7355]">Templates</p></div>
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
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Zap className="w-4 h-4 mr-2" /> Templates
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
            <Button onClick={() => { resetCredForm(); setShowCredDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
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
                    <TableHead>Last Updated</TableHead>
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
                      <TableCell className="text-[#8B7355]">
                        <div className="flex items-center gap-1">
                          <span>{cred.login_email || '-'}</span>
                          {cred.login_email && <Button variant="ghost" size="sm" onClick={() => copyToClipboard(cred.login_email)} title="Copy email"><Copy className="w-3 h-3 text-[#8B7355]" /></Button>}
                        </div>
                      </TableCell>
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
                      <TableCell className="text-sm text-[#8B7355]">{cred.updated_at ? new Date(cred.updated_at).toLocaleDateString() : (cred.created_at ? new Date(cred.created_at).toLocaleDateString() : '-')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewCredentialHistory(cred)} title="View History"><Clock className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditCredential(cred)} title="Edit"><Edit className="w-4 h-4 text-amber-600" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCredential(cred)} title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
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
            <CardContent className="p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
                <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-[#D4BBA6]" />
              </div>
            </CardContent>
          </Card>
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
                      <TableCell className="text-sm text-[#8B7355] max-w-[250px]">
                        {typeof log.details === 'object' ? (
                          <div className="space-y-1">
                            {Object.entries(log.details).map(([key, val]) => (
                              <div key={key} className="flex gap-1">
                                <span className="font-medium text-[#4A3728]">{key}:</span>
                                <span className="truncate">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (log.details || '-')}
                      </TableCell>
                      <TableCell className="text-sm text-[#8B7355]">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TEMPLATES TAB ========== */}
        <TabsContent value="templates" className="space-y-4">
          {/* Templates Info Banner */}
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#4A3728]">Auto-Provisioning Templates</h3>
                  <p className="text-sm text-[#8B7355]">
                    Create templates to automatically provision tools when employees are onboarded or activated. 
                    Tools will be auto-revoked when employees are terminated or deactivated.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => { resetTemplateForm(); setShowTemplateDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Plus className="w-4 h-4 mr-2" /> Create Template
            </Button>
          </div>

          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5EDE5]">
                    <TableHead>Template Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Tools Included</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 bg-[#F5EDE5] rounded-full">
                            <Settings2 className="w-8 h-8 text-[#8B7355]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#4A3728]">No templates yet</p>
                            <p className="text-sm text-[#8B7355]">Create a template to automate tool provisioning</p>
                          </div>
                          <Button onClick={() => { resetTemplateForm(); setShowTemplateDialog(true); }} variant="outline" className="mt-2 border-[#D4BBA6]">
                            <Plus className="w-4 h-4 mr-2" /> Create First Template
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : templates.map(template => (
                    <TableRow key={template.id} className="hover:bg-[#FDF8F3]">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <div>
                            <p className="font-medium text-[#4A3728]">{template.name}</p>
                            {template.description && <p className="text-xs text-[#8B7355] truncate max-w-[200px]">{template.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#8B7355]">{template.department_name || 'All Departments'}</TableCell>
                      <TableCell>
                        <Badge className={
                          template.default_access_level === 'admin' ? 'bg-red-100 text-red-700' :
                          template.default_access_level === 'editor' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }>{template.default_access_level || 'viewer'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(template.tool_names || []).slice(0, 3).map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                          ))}
                          {(template.tool_names || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">+{template.tool_names.length - 3} more</Badge>
                          )}
                          {(template.tool_names || []).length === 0 && (
                            <span className="text-xs text-[#8B7355]">{template.tool_ids?.length || 0} tools</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.is_active !== false ? (
                          <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[#8B7355]">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditTemplate(template)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
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

      {/* Add/Edit Credential Dialog */}
      <Dialog open={showCredDialog} onOpenChange={(open) => { if (!open) resetCredForm(); setShowCredDialog(open); }}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">{editingCred ? 'Edit Credential' : 'Add Credential'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tool *</Label>
              <Select value={credForm.tool_id || "placeholder"} onValueChange={(v) => setCredForm(f => ({ ...f, tool_id: v === "placeholder" ? "" : v }))} disabled={!!editingCred}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select tool" /></SelectTrigger>
                <SelectContent><SelectItem value="placeholder" disabled>Select tool</SelectItem>{tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Login Email</Label><Input value={credForm.login_email} onChange={(e) => setCredForm(f => ({ ...f, login_email: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder="admin@company.com" /></div>
            <div>
              <Label>{editingCred ? 'New Password (leave empty to keep current)' : 'Password *'}</Label>
              <Input type="password" value={credForm.password} onChange={(e) => setCredForm(f => ({ ...f, password: e.target.value }))} className="bg-white border-[#D4BBA6]" placeholder={editingCred ? '••••••••' : ''} />
            </div>
            <div><Label>Notes</Label><Textarea value={credForm.notes} onChange={(e) => setCredForm(f => ({ ...f, notes: e.target.value }))} className="bg-white border-[#D4BBA6]" rows={2} placeholder="Additional notes..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetCredForm(); setShowCredDialog(false); }} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleSaveCredential} className="bg-[#4A3728] text-white"><Shield className="w-4 h-4 mr-2" />{editingCred ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credential History Dialog */}
      <Dialog open={showCredHistoryDialog} onOpenChange={setShowCredHistoryDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[80vh]">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Credential History</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {credHistory.length === 0 ? (
              <p className="text-center py-8 text-[#8B7355]">No history available</p>
            ) : (
              credHistory.map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#F5EDE5] rounded">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.action?.includes('created') ? 'bg-emerald-100' :
                    log.action?.includes('updated') ? 'bg-blue-100' :
                    log.action?.includes('viewed') ? 'bg-amber-100' :
                    log.action?.includes('deleted') ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <FileText className={`w-4 h-4 ${
                      log.action?.includes('created') ? 'text-emerald-600' :
                      log.action?.includes('updated') ? 'text-blue-600' :
                      log.action?.includes('viewed') ? 'text-amber-600' :
                      log.action?.includes('deleted') ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#4A3728]">{log.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p className="text-sm text-[#8B7355]">by {log.user_name || 'System'}</p>
                    <p className="text-xs text-[#8B7355]">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredHistoryDialog(false)} className="border-[#D4BBA6]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={(open) => { if (!open) resetTemplateForm(); setShowTemplateDialog(open); }}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">{editingTemplate ? 'Edit Template' : 'Create Provisioning Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template Name & Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Template Name *</Label>
                <Input 
                  value={templateForm.name} 
                  onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))} 
                  className="bg-white border-[#D4BBA6]" 
                  placeholder="e.g., Marketing Team Default Tools"
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea 
                  value={templateForm.description} 
                  onChange={(e) => setTemplateForm(f => ({ ...f, description: e.target.value }))} 
                  className="bg-white border-[#D4BBA6]" 
                  rows={2}
                  placeholder="Describe when this template applies..."
                />
              </div>
            </div>

            {/* Scope Settings */}
            <div className="p-4 bg-[#F5EDE5] rounded-lg space-y-3">
              <h4 className="font-medium text-[#4A3728] flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Scope Settings
              </h4>
              <p className="text-xs text-[#8B7355]">Leave empty to apply to all employees</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select 
                    value={templateForm.department_id || "all"} 
                    onValueChange={(v) => setTemplateForm(f => ({ ...f, department_id: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-white border-[#D4BBA6]">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Access Level</Label>
                  <Select 
                    value={templateForm.default_access_level} 
                    onValueChange={(v) => setTemplateForm(f => ({ ...f, default_access_level: v }))}
                  >
                    <SelectTrigger className="bg-white border-[#D4BBA6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tool Selection */}
            <div>
              <Label className="mb-2 block">Select Tools to Provision *</Label>
              <div className="border border-[#D4BBA6] rounded-lg max-h-[250px] overflow-y-auto">
                {tools.length === 0 ? (
                  <p className="text-center py-8 text-[#8B7355]">No tools available. Add tools first.</p>
                ) : (
                  <div className="divide-y divide-[#E8D5C4]">
                    {tools.map(tool => (
                      <div 
                        key={tool.id} 
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#FDF8F3] transition-colors ${
                          templateForm.tool_ids.includes(tool.id) ? 'bg-orange-50' : ''
                        }`}
                        onClick={() => toggleToolInTemplate(tool.id)}
                      >
                        <Checkbox 
                          checked={templateForm.tool_ids.includes(tool.id)}
                          onCheckedChange={() => toggleToolInTemplate(tool.id)}
                          className="border-[#D4BBA6] data-[state=checked]:bg-[#4A3728]"
                        />
                        <Package className="w-4 h-4 text-[#8B7355]" />
                        <div className="flex-1">
                          <p className="font-medium text-[#4A3728]">{tool.name}</p>
                          <p className="text-xs text-[#8B7355]">{tool.category}</p>
                        </div>
                        {tool.monthly_cost && (
                          <span className="text-xs text-[#8B7355]">${tool.monthly_cost}/mo</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-[#8B7355] mt-1">{templateForm.tool_ids.length} tool(s) selected</p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3 p-3 bg-[#F5EDE5] rounded-lg">
              <Checkbox 
                id="template-active"
                checked={templateForm.is_active}
                onCheckedChange={(checked) => setTemplateForm(f => ({ ...f, is_active: checked }))}
                className="border-[#D4BBA6] data-[state=checked]:bg-emerald-600"
              />
              <Label htmlFor="template-active" className="cursor-pointer">
                <span className="font-medium text-[#4A3728]">Active</span>
                <p className="text-xs text-[#8B7355]">Inactive templates won't be applied during onboarding</p>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetTemplateForm(); setShowTemplateDialog(false); }} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleTemplateSubmit} className="bg-[#4A3728] text-white">
              <Zap className="w-4 h-4 mr-2" />{editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToolsAccessTable;
