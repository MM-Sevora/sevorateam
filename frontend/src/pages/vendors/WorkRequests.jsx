import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Clock, CheckCircle, Building2,
  Calendar, User, Edit2, Eye, ArrowRight, Loader2
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'];

const WorkRequests = () => {
  const { api, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    expected_completion_date: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, usersRes] = await Promise.all([
        api.get('/vendors/requirements', { params: filter ? { status: filter } : {} }),
        api.get('/admin/users')
      ]);
      setRequests(requestsRes.data.requirements || []);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to load work requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    try {
      if (!formData.title || !formData.description || !formData.department) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/vendors/requirements', formData);
      toast.success('Work request created');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create work request');
    }
  };

  const handleAssignOwner = async (requestId, ownerId) => {
    try {
      await api.post(`/vendors/requirements/${requestId}/assign-owner?owner_id=${ownerId}`);
      toast.success('Owner assigned');
      fetchData();
    } catch (error) {
      toast.error('Failed to assign owner');
    }
  };

  const handleUpdateStatus = async (requestId, status) => {
    try {
      await api.put(`/vendors/requirements/${requestId}`, { status });
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openViewDialog = async (request) => {
    try {
      const res = await api.get(`/vendors/requirements/${request.id}`);
      setSelectedRequest(res.data);
      setShowViewDialog(true);
    } catch (error) {
      toast.error('Failed to load request details');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      department: '',
      expected_completion_date: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      proposal_requested: 'bg-indigo-100 text-indigo-700',
      proposals_received: 'bg-purple-100 text-purple-700',
      vendor_selected: 'bg-teal-100 text-teal-700',
      work_in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="work-requests">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Work Requests</h1>
          <p className="text-[#8B7355]">Manage vendor work requirements</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {['', 'draft', 'proposal_requested', 'vendor_selected', 'work_in_progress', 'completed'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => setFilter(status)}
                className={filter === status ? 'bg-[#4A3728] text-white' : 'border-[#D4BBA6]'}
              >
                {status?.replace(/_/g, ' ') || 'All'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-[#D4BBA6] mb-4" />
            <p className="text-[#8B7355]">No work requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-[#8B7355]">{req.requirement_id}</span>
                      {getStatusBadge(req.status)}
                    </div>
                    <h3 className="font-semibold text-[#4A3728] mb-1">{req.title}</h3>
                    <p className="text-sm text-[#8B7355] line-clamp-2 mb-2">{req.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-[#8B7355]">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {req.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {req.requested_by_name}
                      </span>
                      {req.expected_completion_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due: {formatDate(req.expected_completion_date)}
                        </span>
                      )}
                      {req.assigned_owner_name && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <CheckCircle className="w-3 h-3" /> Assigned: {req.assigned_owner_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!req.assigned_owner_id && (
                      <Select onValueChange={(v) => handleAssignOwner(req.id, v)}>
                        <SelectTrigger className="w-32 bg-white border-[#D4BBA6] text-xs">
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.slice(0, 10).map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openViewDialog(req)}>
                      <Eye className="w-4 h-4 text-[#8B7355]" />
                    </Button>
                    {req.status === 'draft' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(req.id, 'proposal_requested')}
                        className="border-[#D4BBA6]"
                      >
                        Request Proposals
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">New Work Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(f => ({...f, title: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Packaging materials for Q1"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Department *</label>
              <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select department</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Expected Completion Date</label>
              <Input
                type="date"
                value={formData.expected_completion_date}
                onChange={(e) => setFormData(f => ({...f, expected_completion_date: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({...f, description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Describe the work requirement in detail..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Work Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8B7355]">{selectedRequest.requirement_id}</span>
                {getStatusBadge(selectedRequest.status)}
              </div>
              <h3 className="text-lg font-bold text-[#4A3728]">{selectedRequest.title}</h3>
              <p className="text-sm text-[#8B7355]">{selectedRequest.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#8B7355]">Department</p>
                  <p className="font-medium text-[#4A3728]">{selectedRequest.department}</p>
                </div>
                <div>
                  <p className="text-[#8B7355]">Requested By</p>
                  <p className="font-medium text-[#4A3728]">{selectedRequest.requested_by_name}</p>
                </div>
                {selectedRequest.assigned_owner_name && (
                  <div>
                    <p className="text-[#8B7355]">Assigned To</p>
                    <p className="font-medium text-[#4A3728]">{selectedRequest.assigned_owner_name}</p>
                  </div>
                )}
                {selectedRequest.expected_completion_date && (
                  <div>
                    <p className="text-[#8B7355]">Expected Completion</p>
                    <p className="font-medium text-[#4A3728]">{formatDate(selectedRequest.expected_completion_date)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkRequests;
