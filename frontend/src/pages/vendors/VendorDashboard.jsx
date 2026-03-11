import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Building2, Users, ClipboardList, FileText, TrendingUp,
  Clock, CheckCircle, AlertTriangle, ChevronRight, Plus,
  Package, Star, Loader2, RefreshCw, Scale
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4A3728', '#8B7355', '#D4BBA6', '#6B8E23', '#CD853F', '#4682B4'];

const VendorDashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendors/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast.error('Failed to load vendor dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      assigned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      delivered: 'bg-purple-100 text-purple-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
      proposal_requested: 'bg-indigo-100 text-indigo-700',
      vendor_selected: 'bg-teal-100 text-teal-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#FDF8F3] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="vendor-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Vendor Management</h1>
          <p className="text-[#8B7355]">Manage vendors, work requests, and orders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/vendors/database">
            <Button variant="outline" className="border-[#D4BBA6]">
              <Building2 className="w-4 h-4 mr-2" /> Vendors
            </Button>
          </Link>
          <Link to="/vendors/requests">
            <Button variant="outline" className="border-[#D4BBA6]">
              <ClipboardList className="w-4 h-4 mr-2" /> Requests
            </Button>
          </Link>
          <Link to="/vendors/work-orders">
            <Button variant="outline" className="border-[#D4BBA6]">
              <FileText className="w-4 h-4 mr-2" /> Orders
            </Button>
          </Link>
          <Link to="/vendors/recurring">
            <Button variant="outline" className="border-[#D4BBA6]">
              <RefreshCw className="w-4 h-4 mr-2" /> Recurring
            </Button>
          </Link>
          <Link to="/vendors/approvals">
            <Button variant="outline" className="border-[#D4BBA6]">
              <Scale className="w-4 h-4 mr-2" /> Approvals
            </Button>
          </Link>
          <Link to="/vendors/creator-payments">
            <Button variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
              <Star className="w-4 h-4 mr-2" /> Creator Payments
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Total Vendors</p>
                <p className="text-2xl font-bold text-[#4A3728]">{stats?.vendors?.total || 0}</p>
                <p className="text-xs text-emerald-600">{stats?.vendors?.active || 0} active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Work Requests</p>
                <p className="text-2xl font-bold text-[#4A3728]">{stats?.requirements?.total || 0}</p>
                <p className="text-xs text-amber-600">{stats?.requirements?.pending || 0} pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Work Orders</p>
                <p className="text-2xl font-bold text-[#4A3728]">{stats?.work_orders?.total || 0}</p>
                <p className="text-xs text-purple-600">{stats?.work_orders?.open || 0} open</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-[#8B7355]">Completed (Month)</p>
                <p className="text-2xl font-bold text-emerald-600">{stats?.work_orders?.completed_this_month || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendors by Category */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
              <Package className="w-5 h-5" /> Vendors by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.vendors?.by_category?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.vendors.by_category} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="category" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4A3728" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-[#8B7355]">
                No vendor data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Orders by Status */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Work Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.work_orders?.by_status && Object.keys(stats.work_orders.by_status).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(stats.work_orders.by_status).map(([key, value]) => ({
                      name: key.replace(/_/g, ' '),
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {Object.keys(stats.work_orders.by_status).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-[#8B7355]">
                No work orders yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Top Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#4A3728]">Recent Work Orders</CardTitle>
            <Link to="/vendors/work-orders" className="text-sm text-[#8B7355] hover:text-[#4A3728] flex items-center">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.work_orders?.recent?.length > 0 ? (
              <div className="space-y-3">
                {stats.work_orders.recent.map((wo) => (
                  <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F5EDE5]">
                    <div className="flex-1">
                      <p className="font-medium text-[#4A3728]">{wo.work_order_id}</p>
                      <p className="text-xs text-[#8B7355]">{wo.vendor_name} - {wo.department}</p>
                    </div>
                    {getStatusBadge(wo.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B7355]">No work orders yet</div>
            )}
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#4A3728]">Top Vendors</CardTitle>
            <Link to="/vendors/database" className="text-sm text-[#8B7355] hover:text-[#4A3728] flex items-center">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.top_vendors?.length > 0 ? (
              <div className="space-y-3">
                {stats.top_vendors.map((vendor, idx) => (
                  <div key={vendor.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F5EDE5]">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-[#E8D5C4] text-[#4A3728]'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#4A3728]">{vendor.name}</p>
                      <p className="text-xs text-[#8B7355]">{vendor.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#4A3728]">{vendor.total_work_orders}</p>
                      <p className="text-xs text-[#8B7355]">orders</p>
                    </div>
                    {vendor.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B7355]">No vendors with work orders yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Requirements */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-[#4A3728]">Recent Work Requests</CardTitle>
          <Link to="/vendors/requests" className="text-sm text-[#8B7355] hover:text-[#4A3728] flex items-center">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {stats?.requirements?.recent?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.requirements.recent.map((req) => (
                <div key={req.id} className="p-4 border border-[#E8D5C4] rounded-lg hover:bg-[#F5EDE5]">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-[#4A3728] text-sm">{req.requirement_id}</p>
                    {getStatusBadge(req.status)}
                  </div>
                  <p className="text-sm text-[#4A3728] line-clamp-2">{req.title}</p>
                  <p className="text-xs text-[#8B7355] mt-1">{req.department}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#8B7355]">No work requests yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorDashboard;
