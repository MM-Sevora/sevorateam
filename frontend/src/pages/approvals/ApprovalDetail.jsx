import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '../../components/ui/dialog';
import { 
  CheckCircle2, XCircle, Clock, ArrowLeft, User, Building2,
  Calendar, FileText, MessageSquare, ChevronRight, AlertCircle,
  RefreshCw, Send, UserPlus
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

const ApprovalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [comments, setComments] = useState('');
  const [delegateTo, setDelegateTo] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchRequest();
    fetchUsers();
  }, [id]);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/approvals/requests/${id}`);
      setRequest(response.data);
    } catch (error) {
      console.error('Failed to fetch approval request:', error);
      toast.error('Failed to load approval request');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAction = async () => {
    setActionLoading(true);
    try {
      const payload = {
        action: actionType,
        comments: comments || undefined
      };

      if (actionType === 'delegate' && delegateTo) {
        payload.delegate_to = delegateTo;
      }

      await api.post(`/approvals/requests/${id}/action`, payload);
      
      toast.success(`Request ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'updated'} successfully`);
      setShowActionDialog(false);
      setComments('');
      fetchRequest();
    } catch (error) {
      console.error('Failed to perform action:', error);
      toast.error(error.response?.data?.detail || 'Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      await api.post(`/approvals/requests/${id}/cancel`);
      toast.success('Request cancelled');
      navigate('/approvals');
    } catch (error) {
      console.error('Failed to cancel request:', error);
      toast.error(error.response?.data?.detail || 'Failed to cancel request');
    }
  };

  const openActionDialog = (type) => {
    setActionType(type);
    setComments('');
    setDelegateTo('');
    setShowActionDialog(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const icons = {
      pending: Clock,
      approved: CheckCircle2,
      rejected: XCircle,
      cancelled: AlertCircle
    };
    const Icon = icons[status] || Clock;
    
    return (
      <Badge variant="outline" className={`${styles[status] || styles.pending} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isCurrentApprover = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!request || !currentUser.id) return false;
    
    const currentLevel = request.current_level;
    const chain = request.approval_chain || [];
    
    return chain.some(level => 
      level.level === currentLevel && 
      level.approver_id === currentUser.id &&
      level.status === 'pending'
    );
  };

  const isRequester = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    return request?.requester_id === currentUser.id;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium">Request not found</h3>
            <Button onClick={() => navigate('/approvals')} className="mt-4">
              Back to Approvals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="approval-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/approvals')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{request.entity_title}</h1>
            <p className="text-muted-foreground">{request.workflow_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(request.status)}
          {request.amount && (
            <span className="text-2xl font-bold">{formatAmount(request.amount)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Requester</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.requester_name}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(request.submitted_at)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant="outline" className="mt-1">
                    {request.approval_type?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity</p>
                  <span className="text-sm">{request.entity_type}</span>
                </div>
              </div>

              {request.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{request.notes}</p>
                </div>
              )}

              {request.entity_details && Object.keys(request.entity_details).length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Additional Details</p>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {Object.entries(request.entity_details).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1">
                        <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Chain */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Chain</CardTitle>
              <CardDescription>
                Level {request.current_level} of {request.total_levels}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {request.approval_chain?.map((level, index) => (
                  <div key={level.level} className="flex items-start gap-4 pb-6 last:pb-0">
                    {/* Connector line */}
                    {index < request.approval_chain.length - 1 && (
                      <div className="absolute left-[18px] top-[36px] w-0.5 h-[calc(100%-36px)] bg-border" />
                    )}
                    
                    {/* Status icon */}
                    <div className={`relative z-10 p-2 rounded-full ${
                      level.status === 'approved' ? 'bg-green-100' :
                      level.status === 'rejected' ? 'bg-red-100' :
                      level.level === request.current_level ? 'bg-amber-100 ring-2 ring-amber-400' :
                      'bg-muted'
                    }`}>
                      {level.status === 'approved' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : level.status === 'rejected' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-600" />
                      )}
                    </div>

                    {/* Level details */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{level.level_name}</p>
                          <p className="text-sm text-muted-foreground">{level.approver_name}</p>
                        </div>
                        {getStatusBadge(level.status)}
                      </div>
                      {level.comments && (
                        <div className="mt-2 text-sm bg-muted p-2 rounded flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{level.comments}</span>
                        </div>
                      )}
                      {level.action_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(level.action_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* History */}
          {request.history && request.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.history.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <div className="p-1.5 rounded bg-muted">
                        <ChevronRight className="h-3 w-3" />
                      </div>
                      <div>
                        <p>
                          <span className="font-medium">{entry.actor_name || 'System'}</span>
                          {' '}{entry.action}{' '}
                          {entry.level && <span>at level {entry.level}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</p>
                        {entry.comments && (
                          <p className="text-muted-foreground mt-1">"{entry.comments}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {request.status === 'pending' && isCurrentApprover() && (
            <Card>
              <CardHeader>
                <CardTitle>Take Action</CardTitle>
                <CardDescription>You are the current approver</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={() => openActionDialog('approve')}
                  data-testid="approve-btn"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => openActionDialog('reject')}
                  data-testid="reject-btn"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => openActionDialog('request_changes')}
                  data-testid="request-changes-btn"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => openActionDialog('delegate')}
                  data-testid="delegate-btn"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Delegate
                </Button>
              </CardContent>
            </Card>
          )}

          {request.status === 'pending' && isRequester() && (
            <Card>
              <CardHeader>
                <CardTitle>Your Request</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={handleCancel}
                  data-testid="cancel-request-btn"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(request.status)}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>{request.current_level}/{request.total_levels} levels</span>
              </div>
              {request.completed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{formatDate(request.completed_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Request'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'request_changes' && 'Request Changes'}
              {actionType === 'delegate' && 'Delegate Approval'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'Confirm you want to approve this request.'}
              {actionType === 'reject' && 'Provide a reason for rejection.'}
              {actionType === 'request_changes' && 'Specify what changes are needed.'}
              {actionType === 'delegate' && 'Select who should approve this request instead.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'delegate' && (
              <div>
                <label className="text-sm font-medium">Delegate To</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={delegateTo}
                  onChange={(e) => setDelegateTo(e.target.value)}
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">
                Comments {actionType !== 'approve' && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  actionType === 'approve' ? 'Optional comments...' :
                  actionType === 'reject' ? 'Reason for rejection...' :
                  actionType === 'request_changes' ? 'What changes are needed...' :
                  'Additional notes...'
                }
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading || (actionType !== 'approve' && !comments) || (actionType === 'delegate' && !delegateTo)}
              className={
                actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                ''
              }
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {actionType === 'approve' ? 'Approve' :
               actionType === 'reject' ? 'Reject' :
               actionType === 'request_changes' ? 'Request Changes' :
               'Delegate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalDetail;
