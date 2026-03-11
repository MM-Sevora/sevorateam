import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Plus, Search, Eye, EyeOff, Copy, Edit, Trash2, Shield, Lock, Key
} from 'lucide-react';
import { toast } from 'sonner';

const CredentialVault = () => {
  const { api, user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [formData, setFormData] = useState({
    tool_id: '',
    login_email: '',
    password: '',
    two_factor_backup: '',
    notes: '',
    visible_to_roles: [],
    visible_to_departments: []
  });

  useEffect(() => {
    fetchCredentials();
    fetchTools();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await api.get('/acms/credentials');
      setCredentials(response.data.credentials || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await api.get('/acms/tools?limit=100');
      setTools(response.data.tools || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
    }
  };

  const handleRevealPassword = async (credentialId) => {
    if (revealedPasswords[credentialId]) {
      // Hide password
      setRevealedPasswords(prev => ({ ...prev, [credentialId]: null }));
      return;
    }
    
    try {
      const response = await api.get(`/acms/credentials/${credentialId}?reveal_password=true`);
      setRevealedPasswords(prev => ({
        ...prev,
        [credentialId]: {
          password: response.data.password,
          two_factor: response.data.two_factor_backup
        }
      }));
      toast.success('Password revealed - activity logged');
    } catch (error) {
      toast.error('Failed to reveal password');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/acms/credentials', formData);
      toast.success('Credential saved securely');
      setShowDialog(false);
      resetForm();
      fetchCredentials();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save credential');
    }
  };

  const handleDelete = async (cred) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    
    try {
      await api.delete(`/acms/credentials/${cred.id}`);
      toast.success('Credential deleted');
      fetchCredentials();
    } catch (error) {
      toast.error('Failed to delete credential');
    }
  };

  const resetForm = () => {
    setFormData({
      tool_id: '',
      login_email: '',
      password: '',
      two_factor_backup: '',
      notes: '',
      visible_to_roles: [],
      visible_to_departments: []
    });
  };

  const ROLES = ['super_admin', 'hr_admin', 'marketing_manager', 'project_manager', 'sales_manager', 'employee'];
  const DEPARTMENTS = ['marketing', 'sales', 'design', 'development', 'hr', 'finance', 'operations'];

  return (
    <div className="space-y-4 md:space-y-6" data-testid="credential-vault">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Credential Vault</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Securely store and manage shared credentials</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} data-testid="add-credential-btn" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Credential
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
          <Shield className="w-4 h-4 md:w-5 md:h-5 text-amber-600 flex-shrink-0" />
          <p className="text-xs md:text-sm text-amber-800">
            All credentials are encrypted with AES-256. Password views are logged for security audit.
          </p>
        </CardContent>
      </Card>

      {/* Credentials List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {credentials.map(cred => (
            <Card key={cred.id} className="hover:shadow-md transition-shadow" data-testid={`credential-${cred.id}`}>
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base">{cred.tool_name}</h3>
                      <p className="text-xs md:text-sm text-gray-500 truncate">{cred.login_email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Owner: {cred.owner_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevealPassword(cred.id)}
                      data-testid={`reveal-password-${cred.id}`}
                      className="text-xs"
                    >
                      {revealedPasswords[cred.id] ? (
                        <><EyeOff className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Hide</>
                      ) : (
                        <><Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Reveal</>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cred)} className="h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                
                {revealedPasswords[cred.id] && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs text-gray-500">Password</Label>
                        <p className="font-mono text-sm bg-white px-2 py-1 rounded border mt-1">
                          {revealedPasswords[cred.id].password}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(revealedPasswords[cred.id].password, 'Password')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {revealedPasswords[cred.id].two_factor && (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs text-gray-500">2FA Backup Code</Label>
                          <p className="font-mono text-sm bg-white px-2 py-1 rounded border mt-1">
                            {revealedPasswords[cred.id].two_factor}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(revealedPasswords[cred.id].two_factor, '2FA Code')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {cred.notes && (
                  <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {cred.notes}
                  </p>
                )}
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {cred.visible_to_roles?.map(role => (
                    <Badge key={role} variant="secondary" className="text-xs capitalize">
                      {role.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {cred.visible_to_departments?.map(dept => (
                    <Badge key={dept} variant="outline" className="text-xs capitalize">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {credentials.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No credentials stored yet</p>
                <Button className="mt-4" onClick={() => setShowDialog(true)}>
                  Add First Credential
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Credential Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Credential</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tool_id">Tool *</Label>
              <Select 
                value={formData.tool_id} 
                onValueChange={(v) => setFormData({...formData, tool_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tool" />
                </SelectTrigger>
                <SelectContent>
                  {tools.map(tool => (
                    <SelectItem key={tool.id} value={tool.id}>{tool.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="login_email">Login Email/Username *</Label>
              <Input
                id="login_email"
                value={formData.login_email}
                onChange={(e) => setFormData({...formData, login_email: e.target.value})}
                required
                placeholder="team@company.com"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                placeholder="Enter password"
              />
            </div>
            
            <div>
              <Label htmlFor="two_factor_backup">2FA Backup Code (Optional)</Label>
              <Input
                id="two_factor_backup"
                value={formData.two_factor_backup}
                onChange={(e) => setFormData({...formData, two_factor_backup: e.target.value})}
                placeholder="XXXX-XXXX-XXXX"
              />
            </div>
            
            <div>
              <Label>Visible to Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ROLES.map(role => (
                  <Badge
                    key={role}
                    variant={formData.visible_to_roles.includes(role) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      const newRoles = formData.visible_to_roles.includes(role)
                        ? formData.visible_to_roles.filter(r => r !== role)
                        : [...formData.visible_to_roles, role];
                      setFormData({...formData, visible_to_roles: newRoles});
                    }}
                  >
                    {role.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Visible to Departments</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEPARTMENTS.map(dept => (
                  <Badge
                    key={dept}
                    variant={formData.visible_to_departments.includes(dept) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      const newDepts = formData.visible_to_departments.includes(dept)
                        ? formData.visible_to_departments.filter(d => d !== dept)
                        : [...formData.visible_to_departments, dept];
                      setFormData({...formData, visible_to_departments: newDepts});
                    }}
                  >
                    {dept}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes..."
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.tool_id || !formData.login_email || !formData.password}>
                <Shield className="w-4 h-4 mr-2" />
                Save Securely
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CredentialVault;
