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
  ArrowLeft, Plus, Search, Package, Users, Key, Eye, EyeOff, Copy, Trash2,
  Lock, UserX, Shield, Edit, ChevronDown, ChevronUp
} from 'lucide-react';

const ToolsCredentials = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('by-tool');
  
  const [tools, setTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTool, setExpandedTool] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  
  // Add Credential Dialog
  const [showCredDialog, setShowCredDialog] = useState(false);
  const [credForm, setCredForm] = useState({ tool_id: '', login_email: '', password: '', notes: '' });
  
  // Grant Access Dialog
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessCredId, setAccessCredId] = useState(null);
  const [accessForm, setAccessForm] = useState({ user_id: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, usersRes, credsRes, accessRes] = await Promise.all([
        api.get('/acms/tools?limit=100'),
        api.get('/admin/users?limit=200'),
        api.get('/acms/credentials'),
        api.get('/acms/access?limit=500')
      ]);
      setTools(toolsRes.data.tools || []);
      const allUsers = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || [];
      setUsers(allUsers.filter(u => u.status === 'active'));
      setCredentials(credsRes.data.credentials || []);
      setAccessRecords(accessRes.data.access_records || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get credentials for a specific tool
  const getToolCredentials = (toolId) => {
    return credentials.filter(c => c.tool_id === toolId);
  };

  // Get user access for a tool
  const getUserAccessForTool = (toolId) => {
    return accessRecords.filter(a => a.tool_id === toolId);
  };

  // Get tools a user has access to
  const getUserTools = (userId) => {
    const userAccessList = accessRecords.filter(a => a.user_id === userId);
    return userAccessList.map(access => {
      const tool = tools.find(t => t.id === access.tool_id);
      return { ...access, tool_name: tool?.name || 'Unknown', tool_category: tool?.category };
    });
  };

  const handleRevealPassword = async (credId) => {
    if (revealedPasswords[credId]) {
      setRevealedPasswords(p => ({ ...p, [credId]: null }));
      return;
    }
    try {
      const res = await api.get(`/acms/credentials/${credId}?reveal_password=true`);
      setRevealedPasswords(p => ({ ...p, [credId]: { password: res.data.password, two_factor: res.data.two_factor_backup } }));
      toast.success('Password revealed - logged');
    } catch { toast.error('Failed to reveal password'); }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleSaveCredential = async () => {
    if (!credForm.tool_id || !credForm.password) { 
      toast.error('Tool and password required'); 
      return; 
    }
    try {
      await api.post('/acms/credentials', credForm);
      toast.success('Credential saved securely');
      setShowCredDialog(false);
      setCredForm({ tool_id: '', login_email: '', password: '', notes: '' });
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const handleDeleteCredential = async (cred) => {
    if (!confirm(`Delete credential for ${cred.tool_name}?`)) return;
    try {
      await api.delete(`/acms/credentials/${cred.id}`);
      toast.success('Credential deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleRevokeAccess = async (accessId, userName, toolName) => {
    if (!confirm(`Revoke ${userName}'s access to ${toolName}?`)) return;
    try {
      await api.delete(`/acms/access/${accessId}`);
      toast.success('Access revoked');
      fetchData();
    } catch { toast.error('Failed to revoke'); }
  };

  // Group users by their access
  const usersWithAccess = users.filter(u => accessRecords.some(a => a.user_id === u.id));

  const filteredTools = tools.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = usersWithAccess.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="tools-credentials">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-[#8B7355] hover:text-[#4A3728]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#4A3728]">Tools Credentials</h1>
          <p className="text-[#8B7355]">Manage credentials and user access</p>
        </div>
        <Button onClick={() => setShowCredDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Credential
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Lock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{credentials.length}</p>
            <p className="text-xs text-[#8B7355]">Stored Credentials</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{tools.length}</p>
            <p className="text-xs text-[#8B7355]">Tools</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-600">{usersWithAccess.length}</p>
            <p className="text-xs text-[#8B7355]">Users with Access</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
        <Input 
          placeholder="Search tools or users..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-10 bg-white border-[#D4BBA6]" 
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-[#E8D5C4] p-1">
          <TabsTrigger value="by-tool" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Package className="w-4 h-4 mr-2" /> By Tool
          </TabsTrigger>
          <TabsTrigger value="by-user" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" /> By User
          </TabsTrigger>
        </TabsList>

        {/* ====== BY TOOL TAB ====== */}
        <TabsContent value="by-tool" className="space-y-3">
          {loading ? <div className="text-center py-8 text-[#8B7355]">Loading...</div> : (
            filteredTools.map(tool => {
              const toolCreds = getToolCredentials(tool.id);
              const toolAccess = getUserAccessForTool(tool.id);
              const isExpanded = expandedTool === tool.id;
              
              return (
                <Card key={tool.id} className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-4">
                    {/* Tool Header */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F5EDE5] rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-[#4A3728]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#4A3728]">{tool.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-[#8B7355]">
                            <Badge variant="outline">{tool.category || 'Other'}</Badge>
                            <span><Lock className="w-3 h-3 inline mr-1" />{toolCreds.length} credentials</span>
                            <span><Users className="w-3 h-3 inline mr-1" />{toolAccess.length} users</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#E8D5C4] space-y-4">
                        {/* Credentials Section */}
                        <div>
                          <h4 className="text-sm font-medium text-[#4A3728] mb-2 flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Credentials
                          </h4>
                          {toolCreds.length > 0 ? (
                            <div className="space-y-2">
                              {toolCreds.map(cred => (
                                <div key={cred.id} className="flex items-center justify-between p-3 bg-[#F5EDE5] rounded">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-[#4A3728]">{cred.login_email || 'No email'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs bg-white px-2 py-1 rounded">
                                        {revealedPasswords[cred.id]?.password || '••••••••••'}
                                      </code>
                                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRevealPassword(cred.id); }}>
                                        {revealedPasswords[cred.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      </Button>
                                      {revealedPasswords[cred.id] && (
                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyToClipboard(revealedPasswords[cred.id].password, 'Password'); }}>
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteCredential(cred); }}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[#8B7355] py-2">No credentials stored for this tool</p>
                          )}
                        </div>

                        {/* Users with Access Section */}
                        <div>
                          <h4 className="text-sm font-medium text-[#4A3728] mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Users with Access
                          </h4>
                          {toolAccess.length > 0 ? (
                            <div className="space-y-2">
                              {toolAccess.map(access => (
                                <div key={access.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-[#D4BBA6] rounded-full flex items-center justify-center text-white text-xs">
                                      {access.user_name?.charAt(0) || '?'}
                                    </div>
                                    <span className="text-sm text-[#4A3728]">{access.user_name}</span>
                                    <Badge className={
                                      access.access_level === 'admin' ? 'bg-red-100 text-red-700' :
                                      access.access_level === 'editor' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
                                    }>{access.access_level}</Badge>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => { e.stopPropagation(); handleRevokeAccess(access.id, access.user_name, tool.name); }}
                                    title="Revoke Access"
                                  >
                                    <UserX className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[#8B7355] py-2">No users have access</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
          {filteredTools.length === 0 && !loading && (
            <div className="text-center py-8 text-[#8B7355]">No tools found</div>
          )}
        </TabsContent>

        {/* ====== BY USER TAB ====== */}
        <TabsContent value="by-user" className="space-y-3">
          {loading ? <div className="text-center py-8 text-[#8B7355]">Loading...</div> : (
            filteredUsers.length > 0 ? filteredUsers.map(user => {
              const userTools = getUserTools(user.id);
              const isExpanded = expandedUser === user.id;
              
              return (
                <Card key={user.id} className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-4">
                    {/* User Header */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#D4BBA6] rounded-full flex items-center justify-center text-white font-medium">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#4A3728]">{user.name}</h3>
                          <p className="text-xs text-[#8B7355]">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Key className="w-3 h-3 mr-1" /> {userTools.length} tools
                        </Badge>
                        <Button variant="ghost" size="sm">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded - User's Tool Access */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#E8D5C4]">
                        <h4 className="text-sm font-medium text-[#4A3728] mb-2">Tool Access</h4>
                        {userTools.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#F5EDE5]">
                                <TableHead className="text-[#4A3728]">Tool</TableHead>
                                <TableHead className="text-[#4A3728]">Category</TableHead>
                                <TableHead className="text-[#4A3728]">Access Level</TableHead>
                                <TableHead className="text-[#4A3728]">Granted</TableHead>
                                <TableHead className="text-right text-[#4A3728]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userTools.map(access => (
                                <TableRow key={access.id}>
                                  <TableCell className="font-medium text-[#4A3728]">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-[#8B7355]" />
                                      {access.tool_name}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{access.tool_category || 'Other'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={
                                      access.access_level === 'admin' ? 'bg-red-100 text-red-700' :
                                      access.access_level === 'editor' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
                                    }>{access.access_level}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-[#8B7355]">
                                    {access.granted_at ? new Date(access.granted_at).toLocaleDateString() : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleRevokeAccess(access.id, user.name, access.tool_name); }}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <UserX className="w-4 h-4 mr-1" /> Revoke
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-[#8B7355] py-2">No tool access</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="text-center py-8 text-[#8B7355]">No users with tool access found</div>
            )
          )}
        </TabsContent>
      </Tabs>

      {/* Add Credential Dialog */}
      <Dialog open={showCredDialog} onOpenChange={setShowCredDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Add Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Tool *</Label>
              <Select value={credForm.tool_id || "placeholder"} onValueChange={(v) => setCredForm(f => ({ ...f, tool_id: v === "placeholder" ? "" : v }))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]">
                  <SelectValue placeholder="Select tool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select tool</SelectItem>
                  {tools.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#4A3728]">Login Email</Label>
              <Input 
                value={credForm.login_email} 
                onChange={(e) => setCredForm(f => ({ ...f, login_email: e.target.value }))} 
                className="bg-white border-[#D4BBA6]" 
                placeholder="admin@company.com"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Password *</Label>
              <Input 
                type="password"
                value={credForm.password} 
                onChange={(e) => setCredForm(f => ({ ...f, password: e.target.value }))} 
                className="bg-white border-[#D4BBA6]" 
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Notes</Label>
              <Textarea 
                value={credForm.notes} 
                onChange={(e) => setCredForm(f => ({ ...f, notes: e.target.value }))} 
                className="bg-white border-[#D4BBA6]" 
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleSaveCredential} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              <Shield className="w-4 h-4 mr-2" /> Save Securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToolsCredentials;
