import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Package, Users, Key, Shield, Clock, AlertTriangle, 
  DollarSign, FileText, TrendingUp, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ITAdminDashboard = () => {
  const { api } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/acms/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Tools',
      value: dashboard?.tools?.total || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/it-admin/tools'
    },
    {
      title: 'Critical Tools',
      value: dashboard?.tools?.critical_count || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/it-admin/tools?criticality=high'
    },
    {
      title: 'Active Access',
      value: dashboard?.access?.total_records || 0,
      icon: Key,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/it-admin/access'
    },
    {
      title: 'Users with Access',
      value: dashboard?.access?.users_with_access || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/it-admin/access'
    },
    {
      title: 'Pending Requests',
      value: dashboard?.requests?.pending || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/it-admin/requests'
    },
    {
      title: 'Stored Credentials',
      value: dashboard?.credentials?.total || 0,
      icon: Shield,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      link: '/it-admin/credentials'
    },
    {
      title: 'Monthly SaaS Cost',
      value: `$${(dashboard?.tools?.monthly_cost || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      link: '/it-admin/tools'
    },
    {
      title: 'Credentials Viewed (Week)',
      value: dashboard?.credentials?.viewed_this_week || 0,
      icon: Eye,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      link: '/it-admin/audit-logs?action=credential_viewed'
    }
  ];

  return (
    <div className="space-y-6" data-testid="it-admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access & Credential Management</h1>
          <p className="text-gray-500 mt-1">Manage tools, access permissions, and credentials</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Link to={stat.link} key={index}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tools by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Tools by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.tools?.by_category?.length > 0 ? (
                dashboard.tools.by_category.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="capitalize text-gray-700">{cat.category || 'Other'}</span>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No tools registered yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {dashboard?.recent_activity?.length > 0 ? (
                dashboard.recent_activity.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {log.user_name} • {log.entity_name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              to="/it-admin/tools?action=new"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <span className="text-sm font-medium">Add Tool</span>
            </Link>
            <Link 
              to="/it-admin/access?action=new"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <Key className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <span className="text-sm font-medium">Grant Access</span>
            </Link>
            <Link 
              to="/it-admin/credentials?action=new"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <Shield className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <span className="text-sm font-medium">Add Credential</span>
            </Link>
            <Link 
              to="/it-admin/requests"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <Clock className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <span className="text-sm font-medium">Review Requests</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ITAdminDashboard;
