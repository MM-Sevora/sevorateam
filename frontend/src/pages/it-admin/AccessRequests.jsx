import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Plus, Clock, CheckCircle, XCircle, Package, User, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

const AccessRequests = () => {
  const { api, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionComments, setActionComments] = useState('');
  const [formData, setFormData] = useState({
    tool_id: '',
    reason: '',
    duration: 'permanent',
    requested_level: 'viewer'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, myRes, pendingRes, toolsRes] = await Promise.all([
        api.get('/acms/requests?limit=100'),
        api.get('/acms/requests/my-requests'),
        api.get('/acms/requests?my_pending=true'),
        api.get('/acms/tools?limit=100')
      ]);
      
      setRequests(requestsRes.data.requests || []);
      setMyRequests(myRes.data.requests || []);
      setPendingApprovals(pendingRes.data.requests || []);
      setTools(toolsRes.data.tools || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/acms/requests', formData);
      toast.success('Access request submitted');
      setShowRequestDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    }
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    
    try {
      const endpoint = selectedRequest.status === 'pending'
        ? `/acms/requests/${selectedRequest.id}/manager-action`
        : `/acms/requests/${selectedRequest.id}/admin-action`;
      
      await api.post(endpoint, {
        action: actionType,
        comments: actionComments
      });
      
      toast.success(`Request ${actionType}d successfully`);
      setShowActionDialog(false);
      setSelectedRequest(null);
      setActionComments('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  const resetForm = () => {
    setFormData({
      tool_id: '',
      reason: '',
      duration: 'permanent',
      requested_level: 'viewer'
    });
  };

  const openActionDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const RequestCard = ({ request, showActions = false }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{request.tool_name}</h3>
              <p className="text-xs text-gray-500">
                Requested: {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{request.requester_name}</span>
          </div>
          
          <div className="bg-gray-50 p-2 rounded text-gray-700">
            <strong>Reason:</strong> {request.reason}
          </div>
          
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Level: <strong className="capitalize">{request.requested_level}</strong></span>
            <span>Duration: <strong className="capitalize">{request.duration}</strong></span>
          </div>
          
          {request.manager_comments && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Manager: {request.manager_comments}
            </div>
          )}
          
          {request.admin_comments && (
            <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Admin: {request.admin_comments}
            </div>
          )}
        </div>
        
        {showActions && (request.status === 'pending' || request.status === 'manager_approved') && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button
              size="sm"
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => openActionDialog(request, 'approve')}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => openActionDialog(request, 'reject')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" data-testid="access-requests">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Requests</h1>
          <p className="text-gray-500 mt-1">Request and manage tool access approvals</p>
        </div>
        <Button onClick={() => { resetForm(); setShowRequestDialog(true); }} data-testid="new-request-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending Approvals
              {pendingApprovals.length > 0 && (
                <Badge variant="secondary">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovals.map(request => (
                <RequestCard key={request.id} request={request} showActions={true} />
              ))}
              
              {pendingApprovals.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                  <p>No pending requests to review</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-requests">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
              
              {myRequests.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <p>You haven't submitted any requests</p>
                  <Button className="mt-4" onClick={() => setShowRequestDialog(true)}>
                    Request Access
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map(request => (
                <RequestCard key={request.id} request={request} showActions={
                  (request.status === 'pending' || request.status === 'manager_approved') &&
                  (user?.role === 'super_admin' || user?.role === 'hr_admin')
                } />
              ))}
              
              {requests.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No requests found
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* New Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Tool Access</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <Label>Tool *</Label>
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
              <Label>Access Level Needed</Label>
              <Select 
                value={formData.requested_level} 
                onValueChange={(v) => setFormData({...formData, requested_level: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Duration</Label>
              <Select 
                value={formData.duration} 
                onValueChange={(v) => setFormData({...formData, duration: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Why do you need access to this tool?"
                required
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.tool_id || !formData.reason}>
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm"><strong>Tool:</strong> {selectedRequest?.tool_name}</p>
              <p className="text-sm"><strong>Requester:</strong> {selectedRequest?.requester_name}</p>
              <p className="text-sm"><strong>Reason:</strong> {selectedRequest?.reason}</p>
            </div>
            
            <div>
              <Label>Comments (Optional)</Label>
              <Textarea
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                placeholder="Add any comments..."
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowActionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={actionType === 'reject' ? 'destructive' : 'default'}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessRequests;
