import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Clock, Calendar, User, FileText,
  Loader2, RefreshCw, DollarSign, Briefcase, ClipboardList,
  AlertTriangle, ChevronRight, History, Filter
} from 'lucide-react';
import api from '../../lib/api';
import { format } from 'date-fns';

const APPROVAL_TYPES = {
  leave: { label: 'Leave Requests', icon: Calendar, color: 'bg-blue-500', badgeColor: 'bg-blue-100 text-blue-800' },
  expense: { label: 'Expenses', icon: DollarSign, color: 'bg-green-500', badgeColor: 'bg-green-100 text-green-800' },
  reimbursement: { label: 'Reimbursements', icon: DollarSign, color: 'bg-amber-500', badgeColor: 'bg-amber-100 text-amber-800' },
  document: { label: 'Documents', icon: FileText, color: 'bg-purple-500', badgeColor: 'bg-purple-100 text-purple-800' },
  other: { label: 'Other', icon: ClipboardList, color: 'bg-gray-500', badgeColor: 'bg-gray-100 text-gray-800' }
};

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState({ total: 0, grouped: {}, tasks: [] });
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const response = await api.get('/tasks/approvals/pending');
      setPendingApprovals(response.data);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to load pending approvals');
    }
  }, []);

  const fetchApprovalHistory = useCallback(async () => {
    try {
      const response = await api.get('/tasks/approvals/history?limit=50');
      setApprovalHistory(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching approval history:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPendingApprovals(), fetchApprovalHistory()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPendingApprovals, fetchApprovalHistory]);

  const handleApprove = async () => {
    if (!selectedTask) return;
    setProcessing(true);
    try {
      await api.post(`/tasks/${selectedTask.id}/approve`, { notes: approvalNotes });
      toast.success('Approved successfully');
      setShowApproveDialog(false);
      setApprovalNotes('');
      setSelectedTask(null);
      fetchPendingApprovals();
      fetchApprovalHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTask || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessing(true);
    try {
      await api.post(`/tasks/${selectedTask.id}/reject`, { reason: rejectionReason });
      toast.success('Rejected');
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedTask(null);
      fetchPendingApprovals();
      fetchApprovalHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  const openApproveDialog = (task) => {
    setSelectedTask(task);
    setShowApproveDialog(true);
  };

  const openRejectDialog = (task) => {
    setSelectedTask(task);
    setShowRejectDialog(true);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-[#FAF7F5] to-[#F5EBE0] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Approvals</h1>
          <p className="text-[#6B5D52] mt-1">Review and approve pending requests</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { fetchPendingApprovals(); fetchApprovalHistory(); }}
          className="border-[#D4BBA6]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(APPROVAL_TYPES).map(([key, type]) => {
          const TypeIcon = type.icon;
          const count = pendingApprovals.grouped?.[key]?.length || 0;
          return (
            <Card key={key} className={`border-[#E8DED5] ${count > 0 ? 'ring-2 ring-teal-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center`}>
                    <TypeIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#4A3728]">{count}</p>
                    <p className="text-xs text-[#6B5D52]">{type.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EBE0] border border-[#E8DED5]">
          <TabsTrigger value="pending" className="data-[state=active]:bg-white">
            <Clock className="w-4 h-4 mr-2" />
            Pending ({pendingApprovals.total})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-4">
          {pendingApprovals.total === 0 ? (
            <Card className="border-[#E8DED5]">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-[#4A3728]">All caught up!</h3>
                <p className="text-[#6B5D52]">No pending approvals at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.tasks.map((task) => {
                const typeConfig = APPROVAL_TYPES[task.approval_type] || APPROVAL_TYPES.other;
                const TypeIcon = typeConfig.icon;
                
                return (
                  <Card key={task.id} className="border-[#E8DED5] hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 ${typeConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <TypeIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-[#4A3728]">{task.title}</h3>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              <Badge className={typeConfig.badgeColor}>
                                {typeConfig.label}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-[#6B5D52] mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-[#8B7355]">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {task.created_by_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.created_at), 'MMM d, yyyy')}
                              </span>
                              {task.due_date && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="w-3 h-3" />
                                  Due: {format(new Date(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.related_url && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(task.related_url, '_blank')}
                              className="border-[#D4BBA6]"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openRejectDialog(task)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => openApproveDialog(task)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {approvalHistory.length === 0 ? (
            <Card className="border-[#E8DED5]">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-[#4A3728]">No approval history</h3>
                <p className="text-[#6B5D52]">Your approval actions will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvalHistory.map((task) => {
                const typeConfig = APPROVAL_TYPES[task.approval_type] || APPROVAL_TYPES.other;
                const isApproved = task.approval_status === 'approved';
                
                return (
                  <Card key={task.id} className="border-[#E8DED5]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isApproved ? 'bg-green-100' : 'bg-red-100'}`}>
                            {isApproved ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#4A3728]">{task.title}</p>
                            <p className="text-xs text-[#6B5D52]">
                              {isApproved ? 'Approved' : 'Rejected'} on {format(new Date(task.approved_at), 'MMM d, yyyy')}
                              {task.approval_notes && ` • ${task.approval_notes}`}
                            </p>
                          </div>
                        </div>
                        <Badge className={typeConfig.badgeColor}>
                          {typeConfig.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Approve Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="font-medium text-green-800">{selectedTask?.title}</p>
              <p className="text-sm text-green-600">Requested by {selectedTask?.created_by_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes for the requester..."
                className="border-[#D4BBA6]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium text-red-800">{selectedTask?.title}</p>
              <p className="text-sm text-red-600">Requested by {selectedTask?.created_by_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Reason for rejection <span className="text-red-500">*</span></Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason..."
                className="border-[#D4BBA6]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={processing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
