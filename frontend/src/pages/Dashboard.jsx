import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const CHART_COLORS = ['#064E3B', '#D4AF37', '#1E3A8A', '#B45309', '#78350F'];

const Dashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [channelData, setChannelData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, channelRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/channel-performance')
      ]);
      setStats(statsRes.data);
      setChannelData(channelRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sourceChartData = stats?.leads_by_source
    ? Object.entries(stats.leads_by_source).map(([name, value]) => ({ name, value }))
    : [];

  const stageChartData = stats?.leads_by_stage
    ? Object.entries(stats.leads_by_stage).map(([name, value]) => ({ name: name.replace('Session ', '').replace('Styling ', ''), value }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-slide-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 font-body text-sm">Overview of your sales pipeline and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stat-card" data-testid="stat-total-leads">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Leads</p>
              <p className="text-3xl font-heading mt-2">{stats?.total_leads || 0}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
                <span>{stats?.leads_today || 0} today</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="stat-card" data-testid="stat-customers">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Customers</p>
              <p className="text-3xl font-heading mt-2">{stats?.total_customers || 0}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-gold-600">
                <UserCheck className="w-4 h-4" />
                <span>Active profiles</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gold/10 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-gold" />
            </div>
          </div>
        </Card>

        <Card className="stat-card" data-testid="stat-conversion">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Conversion Rate</p>
              <p className="text-3xl font-heading mt-2">{stats?.conversion_rate || 0}%</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span>{stats?.orders_this_month || 0} orders this month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="stat-card" data-testid="stat-sessions">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Styling Sessions</p>
              <p className="text-3xl font-heading mt-2">{stats?.styling_sessions_scheduled || 0}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Scheduled</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <Card className="card-sharp" data-testid="chart-leads-by-source">
          <h3 className="text-lg font-heading mb-6">Leads by Source</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceChartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E7E5E4',
                    borderRadius: 0,
                    fontSize: 12
                  }}
                />
                <Bar dataKey="value" fill="#064E3B" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pipeline Distribution */}
        <Card className="card-sharp" data-testid="chart-pipeline">
          <h3 className="text-lg font-heading mb-6">Pipeline Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stageChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#E7E5E4' }}
                >
                  {stageChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E7E5E4',
                    borderRadius: 0,
                    fontSize: 12
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Channel Performance Table */}
      <Card className="card-sharp" data-testid="channel-performance-table">
        <h3 className="text-lg font-heading mb-6">Channel Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header-editorial text-left pb-4">Source</th>
                <th className="table-header-editorial text-right pb-4">Leads</th>
                <th className="table-header-editorial text-right pb-4">Contacted</th>
                <th className="table-header-editorial text-right pb-4">Converted</th>
                <th className="table-header-editorial text-right pb-4">Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {channelData.map((channel) => (
                <tr key={channel.source} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-4 font-medium">{channel.source}</td>
                  <td className="py-4 text-right">{channel.leads}</td>
                  <td className="py-4 text-right">{channel.contacted}</td>
                  <td className="py-4 text-right">{channel.converted}</td>
                  <td className="py-4 text-right">
                    <Badge variant="outline" className="rounded-full">
                      {channel.leads > 0 ? ((channel.converted / channel.leads) * 100).toFixed(1) : 0}%
                    </Badge>
                  </td>
                </tr>
              ))}
              {channelData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No channel data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
