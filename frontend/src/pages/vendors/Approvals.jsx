import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Clock, AlertCircle, Loader2, DollarSign,
  Building2, User, ArrowRight, MessageSquare, RefreshCw, FileText
} from 'lucide-react';

const Approvals = () => {
  const { api, user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionType, setActionType] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendors/approvals/pending');
      setApprovals(res.data.approvals || []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (approval, action) => {
    setSelectedApproval(approval);
    setActionType(action);
    setComments('');
    setShowActionDialog(true);
  };

  const handleAction = async () => {
    try {
      setSubmitting(true);
      await api.post(`/vendors/approvals/${selectedApproval.id}/action`, {
        action: actionType,
        comments: comments
      });
      toast.success(`Request ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'sent back for revision'}`);
      setShowActionDialog(false);
      fetchApprovals();
    } catch (error) {
      toast.error(`Failed to ${actionType} request`);
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelBadge = (level) => {
    const styles = {
      team_lead: 'bg-blue-100 text-blue-700',
      manager: 'bg-purple-100 text-purple-700',
      finance: 'bg-emerald-100 text-emerald-700'
    };
    return <Badge className={styles[level] || 'bg-gray-100'}>{level?.replace('_', ' ')}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="approvals">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Pending Approvals</h1>
          <p className="text-[#8B7355]">Review and approve vendor selection requests</p>
        </div>
        <Button variant="outline" onClick={fetchApprovals} className="border-[#D4BBA6]">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {approvals.filter(a => a.current_level === 'team_lead').length}
                </p>
                <p className="text-sm text-blue-700">Team Lead Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {approvals.filter(a => a.current_level === 'manager').length}
                </p>
                <p className="text-sm text-purple-700">Manager Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {approvals.filter(a => a.current_level === 'finance').length}
                </p>
                <p className="text-sm text-emerald-700">Finance Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : approvals.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
            <p className="text-[#4A3728] font-medium">All caught up!</p>
            <p className="text-sm text-[#8B7355]">No pending approvals at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow" data-testid={`approval-${approval.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <FileText className="w-4 h-4 text-[#8B7355]" />
                      <span className="font-semibold text-[#4A3728]">{approval.entity_name}</span>
                      {getLevelBadge(approval.current_level)}
                      <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    </div>
                    
                    {approval.requirement_details && (
                      <div className="mt-2 p-3 bg-[#F5EDE5] rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-[#8B7355] text-xs">Department</p>
                            <p className="font-medium text-[#4A3728]">{approval.requirement_details.department}</p>
                          </div>
                          <div>
                            <p className="text-[#8B7355] text-xs">Submitted By</p>
                            <p className="font-medium text-[#4A3728]">{approval.submitted_by_name}</p>
                          </div>
                          <div>
                            <p className="text-[#8B7355] text-xs">Submitted On</p>
                            <p className="font-medium text-[#4A3728]">{formatDate(approval.submitted_at)}</p>
                          </div>
                          {approval.selected_amount && (
                            <div>
                              <p className="text-[#8B7355] text-xs">Selected Amount</p>
                              <p className="font-bold text-emerald-600">{formatCurrency(approval.selected_amount)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Approval Workflow */}
                    <div className="mt-3 flex items-center gap-2">
                      {approval.levels?.map((level, idx) => (
                        <React.Fragment key={level.level}>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            level.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            level.status === 'pending' && level.level === approval.current_level ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400' :
                            level.status === 'pending' ? 'bg-gray-100 text-gray-500' :
                            level.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {level.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                             level.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            <span className="capitalize">{level.level.replace('_', ' ')}</span>
                          </div>
                          {idx < approval.levels.length - 1 && <ArrowRight className="w-3 h-3 text-[#D4BBA6]" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => openActionDialog(approval, 'request_revision')}
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      data-testid={`revision-${approval.id}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" /> Revision
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => openActionDialog(approval, 'reject')}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      data-testid={`reject-${approval.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => openActionDialog(approval, 'approve')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      data-testid={`approve-${approval.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              {actionType === 'approve' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {actionType === 'reject' && <XCircle className="w-5 h-5 text-red-600" />}
              {actionType === 'request_revision' && <AlertCircle className="w-5 h-5 text-orange-600" />}
              {actionType === 'approve' ? 'Approve Request' : 
               actionType === 'reject' ? 'Reject Request' : 'Request Revision'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedApproval && (
              <div className="p-3 bg-[#F5EDE5] rounded-lg">
                <p className="font-medium text-[#4A3728]">{selectedApproval.entity_name}</p>
                <p className="text-sm text-[#8B7355]">Current level: {selectedApproval.current_level?.replace('_', ' ')}</p>
                {selectedApproval.selected_amount && (
                  <p className="text-sm font-bold text-emerald-600 mt-1">
                    Amount: {formatCurrency(selectedApproval.selected_amount)}
                  </p>
                )}
              </div>
            )}
            
            <div>
              <label className="text-sm text-[#8B7355]">
                Comments {actionType !== 'approve' && '*'}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="bg-white border-[#D4BBA6]"
                placeholder={
                  actionType === 'approve' ? 'Optional comments...' :
                  actionType === 'reject' ? 'Please provide reason for rejection...' :
                  'Please specify what needs to be revised...'
                }
                rows={3}
                data-testid="approval-comments"
              />
            </div>

            {actionType === 'approve' && (
              <p className="text-sm text-[#8B7355]">
                {selectedApproval?.current_level === 'finance' 
                  ? 'This is the final approval. The work order can be created after this.'
                  : 'This will forward the request to the next approval level.'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button 
              onClick={handleAction} 
              disabled={submitting || (actionType !== 'approve' && !comments.trim())}
              className={
                actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-orange-600 hover:bg-orange-700 text-white'
              }
              data-testid="confirm-action-btn"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Send Back'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;
