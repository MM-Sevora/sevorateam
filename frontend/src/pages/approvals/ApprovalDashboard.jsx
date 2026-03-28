import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  CheckCircle2, XCircle, Clock, Send, FileText, 
  ArrowRight, RefreshCw, ClipboardList, User
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

const ApprovalDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, pendingRes, myRequestsRes] = await Promise.all([
        api.get('/approvals/dashboard'),
        api.get('/approvals/pending-my-approval'),
        api.get('/approvals/my-requests')
      ]);

      setDashboard(dashboardRes.data);
      setPendingApprovals(pendingRes.data.requests || []);
      setMyRequests(myRequestsRes.data.requests || []);
    } catch (error) {
      console.error('Failed to fetch approval data:', error);
      toast.error('Failed to load approval dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.pending}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const getApprovalTypeIcon = (type) => {
    const icons = {
      expense_claim: FileText,
      leave_request: Clock,
      purchase_requisition: ClipboardList,
      vendor_payment: Send
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="approval-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-muted-foreground">Manage approval requests and track status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/approvals/new')} data-testid="new-request-btn">
            <Send className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending My Approval</p>
                <p className="text-2xl font-bold">{dashboard?.pending_my_approval || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Pending Requests</p>
                <p className="text-2xl font-bold">{dashboard?.my_requests?.pending || 0}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Approved</p>
                <p className="text-2xl font-bold">{dashboard?.my_requests?.approved || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Rejected</p>
                <p className="text-2xl font-bold">{dashboard?.my_requests?.rejected || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Stats */}
      {dashboard?.admin_stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Organization Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{dashboard.admin_stats.total_pending}</p>
                <p className="text-xs text-muted-foreground">Total Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{dashboard.admin_stats.total_approved}</p>
                <p className="text-xs text-muted-foreground">Total Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{dashboard.admin_stats.total_rejected}</p>
                <p className="text-xs text-muted-foreground">Total Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="pending-approvals-tab">
            Pending My Approval 
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-requests" data-testid="my-requests-tab">
            My Requests
            {myRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{myRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground">No pending approvals at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((request) => (
                <Card 
                  key={request.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/approvals/${request.id}`)}
                  data-testid={`approval-request-${request.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          {getApprovalTypeIcon(request.approval_type)}
                        </div>
                        <div>
                          <h4 className="font-medium">{request.entity_title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{request.requester_name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{formatDate(request.submitted_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {request.amount && (
                          <span className="font-semibold text-lg">
                            {formatAmount(request.amount)}
                          </span>
                        )}
                        <Badge variant="outline" className="bg-amber-50">
                          Level {request.current_level}/{request.total_levels}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="mt-4">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No requests yet</h3>
                <p className="text-muted-foreground">Your submitted requests will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/approvals/${request.id}`)}
                  data-testid={`my-request-${request.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          {getApprovalTypeIcon(request.approval_type)}
                        </div>
                        <div>
                          <h4 className="font-medium">{request.entity_title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{request.workflow_name}</span>
                            <span>•</span>
                            <span>{formatDate(request.submitted_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {request.amount && (
                          <span className="font-semibold">
                            {formatAmount(request.amount)}
                          </span>
                        )}
                        {getStatusBadge(request.status)}
                        {request.status === 'pending' && (
                          <Badge variant="outline">
                            Level {request.current_level}/{request.total_levels}
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApprovalDashboard;
