import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  UserPlus, UserMinus, Package, AlertTriangle, CheckCircle, ArrowRight, Shield, Users
} from 'lucide-react';
import { toast } from 'sonner';

const OnboardingManagement = () => {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [showOffboardDialog, setShowOffboardDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [offboardPreview, setOffboardPreview] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [onboardResult, setOnboardResult] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users?limit=200');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await api.post(`/acms/onboard/${selectedUser.id}`);
      setOnboardResult(response.data);
      toast.success(`${response.data.assigned_tools?.length || 0} tools assigned`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Onboarding failed');
    }
  };

  const handleOffboardPreview = async (user) => {
    setSelectedUser(user);
    try {
      const response = await api.get(`/acms/offboard/${user.id}/preview`);
      setOffboardPreview(response.data);
      setShowOffboardDialog(true);
    } catch (error) {
      toast.error('Failed to preview offboarding');
    }
  };

  const handleOffboard = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await api.post(`/acms/offboard/${selectedUser.id}`, {
        transfer_to: transferTo || null
      });
      toast.success(`User offboarded. ${response.data.revoked_tools?.length || 0} access records revoked`);
      setShowOffboardDialog(false);
      setOffboardPreview(null);
      setSelectedUser(null);
      setTransferTo('');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Offboarding failed');
    }
  };

  const activeUsers = users.filter(u => u.is_active !== false);
  const inactiveUsers = users.filter(u => u.is_active === false);

  return (
    <div className="space-y-6" data-testid="onboarding-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding & Offboarding</h1>
          <p className="text-gray-500 mt-1">Manage employee access lifecycle</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeUsers.length}</p>
              <p className="text-sm text-gray-500">Active Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-gray-500">Pending Onboarding</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <UserMinus className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inactiveUsers.length}</p>
              <p className="text-sm text-gray-500">Offboarded Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Users</TabsTrigger>
            <TabsTrigger value="inactive">Offboarded Users</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {user.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {user.department || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm capitalize">{user.role?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedUser(user); setShowOnboardDialog(true); setOnboardResult(null); }}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Onboard
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleOffboardPreview(user)}
                            >
                              <UserMinus className="w-4 h-4 mr-1" />
                              Offboard
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inactive">
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                {inactiveUsers.length === 0 ? (
                  <p>No offboarded users</p>
                ) : (
                  <div className="space-y-2">
                    {inactiveUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>{user.name} ({user.email})</span>
                        <Badge variant="secondary">Offboarded</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Onboard Dialog */}
      <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                    {selectedUser.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {selectedUser.department} • {selectedUser.role?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-600">
              This will assign default tool access based on the user's department and role.
            </p>
            
            {onboardResult && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <CheckCircle className="w-5 h-5" />
                  Onboarding Complete
                </div>
                {onboardResult.assigned_tools?.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm text-green-600">Assigned tools:</p>
                    {onboardResult.assigned_tools.map((tool, i) => (
                      <Badge key={i} variant="secondary" className="mr-1">{tool}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-600">No default tools configured for this role/department</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardDialog(false)}>
              Close
            </Button>
            {!onboardResult && (
              <Button onClick={handleOnboard}>
                <UserPlus className="w-4 h-4 mr-2" />
                Onboard User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offboard Dialog */}
      <Dialog open={showOffboardDialog} onOpenChange={setShowOffboardDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Offboard User
            </DialogTitle>
          </DialogHeader>
          
          {offboardPreview && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">{offboardPreview.user?.name}</p>
                <p className="text-sm text-gray-500">{offboardPreview.user?.email}</p>
              </div>
              
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-red-800 font-medium mb-2">
                  The following access will be revoked:
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {offboardPreview.tools_to_revoke?.map((tool, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        {tool.tool_name}
                      </span>
                      <Badge className={
                        tool.criticality === 'high' ? 'bg-red-100 text-red-800' :
                        tool.criticality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {tool.access_level}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-red-600 mt-2">
                  Total: {offboardPreview.total_access_records} access records
                </p>
              </div>
              
              {offboardPreview.credentials_to_transfer?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-amber-800 font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Credentials to transfer:
                  </p>
                  <ul className="text-sm space-y-1">
                    {offboardPreview.credentials_to_transfer.map((cred, i) => (
                      <li key={i}>• {cred.tool_name}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <Label>Transfer Admin/Editor access to:</Label>
                <Select value={transferTo || "none"} onValueChange={(v) => setTransferTo(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No transfer</SelectItem>
                    {activeUsers.filter(u => u.id !== selectedUser?.id).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOffboardDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleOffboard}>
              <UserMinus className="w-4 h-4 mr-2" />
              Confirm Offboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingManagement;
