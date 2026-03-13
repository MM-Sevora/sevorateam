import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { 
  Plus, Search, Key, Trash2, Users, Package, Edit, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const ACCESS_LEVELS = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'editor', label: 'Editor', color: 'bg-blue-100 text-blue-800' },
  { value: 'viewer', label: 'Viewer', color: 'bg-green-100 text-green-800' },
  { value: 'custom', label: 'Custom', color: 'bg-purple-100 text-purple-800' }
];

const AccessManagement = () => {
  const { api, user } = useAuth();
  const [accessRecords, setAccessRecords] = useState([]);
  const [tools, setTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [myTools, setMyTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // all, my-tools
  const [formData, setFormData] = useState({
    user_id: '',
    tool_id: '',
    access_level: 'viewer',
    expiry_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accessRes, toolsRes, usersRes, myToolsRes] = await Promise.all([
        api.get('/acms/access?limit=200'),
        api.get('/acms/tools?limit=100'),
        api.get('/admin/users?limit=200'),
        api.get('/acms/access/my-tools')
      ]);
      
      setAccessRecords(accessRes.data.access_records || []);
      setTools(toolsRes.data.tools || []);
      const allUsers = usersRes.data.users || [];
      setUsers(allUsers.filter(u => u.status === 'active'));
      setMyTools(myToolsRes.data.tools || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/acms/access', {
        ...formData,
        expiry_date: formData.expiry_date || null
      });
      toast.success('Access granted successfully');
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to grant access');
    }
  };

  const handleRevoke = async (accessId, userName, toolName) => {
    if (!confirm(`Revoke ${userName}'s access to ${toolName}?`)) return;
    
    try {
      await api.delete(`/acms/access/${accessId}`);
      toast.success('Access revoked');
      fetchData();
    } catch (error) {
      toast.error('Failed to revoke access');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      tool_id: '',
      access_level: 'viewer',
      expiry_date: ''
    });
  };

  const getAccessLevelBadge = (level) => {
    const found = ACCESS_LEVELS.find(a => a.value === level);
    return found ? <Badge className={found.color}>{found.label}</Badge> : <Badge>{level}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="access-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
          <p className="text-gray-500 mt-1">Manage user access to tools and platforms</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Access</SelectItem>
              <SelectItem value="my-tools">My Tools</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} data-testid="grant-access-btn">
            <Plus className="w-4 h-4 mr-2" />
            Grant Access
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : viewMode === 'my-tools' ? (
        /* My Tools View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myTools.map(tool => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{tool.category}</p>
                    </div>
                  </div>
                  {getAccessLevelBadge(tool.my_access_level)}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Granted: {new Date(tool.access_granted_at).toLocaleDateString()}
                  </div>
                  {tool.access_expiry && (
                    <div className="text-orange-600 mt-1">
                      Expires: {new Date(tool.access_expiry).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {myTools.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              You don't have access to any tools yet
            </div>
          )}
        </div>
      ) : (
        /* All Access View - Table */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Granted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accessRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                          <span className="text-sm font-medium">{record.user_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{record.tool_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getAccessLevelBadge(record.access_level)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {record.access_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(record.granted_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.expiry_date ? (
                          <span className="text-orange-600">
                            {new Date(record.expiry_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(record.id, record.user_name, record.tool_name)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  
                  {accessRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No access records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grant Access Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Tool Access</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>User *</Label>
              <Select 
                value={formData.user_id} 
                onValueChange={(v) => setFormData({...formData, user_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tool *</Label>
              <Select 
                value={formData.tool_id} 
                onValueChange={(v) => setFormData({...formData, tool_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tool" />
                </SelectTrigger>
                <SelectContent>
                  {tools.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Access Level</Label>
              <Select 
                value={formData.access_level} 
                onValueChange={(v) => setFormData({...formData, access_level: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.user_id || !formData.tool_id}>
                <Key className="w-4 h-4 mr-2" />
                Grant Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessManagement;
