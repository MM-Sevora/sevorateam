import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign
} from 'lucide-react';

const CHART_COLORS = ['#064E3B', '#D4AF37', '#1E3A8A', '#B45309', '#78350F', '#6B21A8'];

const AnalyticsPage = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [channelData, setChannelData] = useState([]);
  const [stylistData, setStylistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const [statsRes, channelRes, stylistRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/channel-performance'),
        api.get('/dashboard/stylist-performance')
      ]);
      setStats(statsRes.data);
      setChannelData(channelRes.data);
      setStylistData(stylistRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sourceChartData = stats?.leads_by_source
    ? Object.entries(stats.leads_by_source)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  const stageChartData = stats?.leads_by_stage
    ? Object.entries(stats.leads_by_stage).map(([name, value]) => ({
        name: name.replace('Session ', '').replace('Styling ', '').replace(' / Selection', ''),
        value
      }))
    : [];

  const conversionFunnelData = channelData.map(ch => ({
    name: ch.source.length > 12 ? ch.source.substring(0, 12) + '...' : ch.source,
    leads: ch.leads,
    contacted: ch.contacted,
    converted: ch.converted,
    conversion_rate: ch.leads > 0 ? ((ch.converted / ch.leads) * 100).toFixed(1) : 0
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-slide-in" data-testid="analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1 font-body text-sm">Channel performance and conversion insights</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px] rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stat-card" data-testid="kpi-total-leads">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Leads</p>
              <p className="text-2xl font-heading">{stats?.total_leads || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card" data-testid="kpi-conversion">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-heading">{stats?.conversion_rate || 0}%</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card" data-testid="kpi-orders">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Orders This Month</p>
              <p className="text-2xl font-heading">{stats?.orders_this_month || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="stat-card" data-testid="kpi-revenue">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-heading">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                  notation: 'compact'
                }).format(stats?.total_revenue || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <Card className="card-sharp" data-testid="chart-source-distribution">
          <h3 className="text-lg font-heading mb-6">Lead Source Distribution</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#E7E5E4' }}
                >
                  {sourceChartData.map((entry, index) => (
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
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Conversion Funnel */}
        <Card className="card-sharp" data-testid="chart-conversion-funnel">
          <h3 className="text-lg font-heading mb-6">Conversion Funnel by Channel</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionFunnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E7E5E4',
                    borderRadius: 0,
                    fontSize: 12
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="leads" fill="#064E3B" name="Leads" radius={[0, 2, 2, 0]} />
                <Bar dataKey="contacted" fill="#D4AF37" name="Contacted" radius={[0, 2, 2, 0]} />
                <Bar dataKey="converted" fill="#1E3A8A" name="Converted" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stage Distribution */}
        <Card className="card-sharp" data-testid="chart-pipeline-distribution">
          <h3 className="text-lg font-heading mb-6">Pipeline Stage Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E7E5E4',
                    borderRadius: 0,
                    fontSize: 12
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#064E3B"
                  fill="#064E3B"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stylist Performance */}
        <Card className="card-sharp" data-testid="chart-stylist-performance">
          <h3 className="text-lg font-heading mb-6">Stylist Performance</h3>
          {stylistData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header-editorial text-left pb-4">Stylist</th>
                    <th className="table-header-editorial text-right pb-4">Assigned</th>
                    <th className="table-header-editorial text-right pb-4">Converted</th>
                    <th className="table-header-editorial text-right pb-4">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stylistData.map((stylist) => (
                    <tr key={stylist.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-4 font-medium">{stylist.name}</td>
                      <td className="py-4 text-right">{stylist.assigned}</td>
                      <td className="py-4 text-right">{stylist.converted}</td>
                      <td className="py-4 text-right">
                        <Badge
                          variant="outline"
                          className={`rounded-full ${
                            stylist.conversion_rate >= 30
                              ? 'bg-emerald-100 text-emerald-800'
                              : stylist.conversion_rate >= 15
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {stylist.conversion_rate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No stylist data available yet
            </div>
          )}
        </Card>
      </div>

      {/* Channel Performance Detail Table */}
      <Card className="card-sharp" data-testid="channel-detail-table">
        <h3 className="text-lg font-heading mb-6">Channel Performance Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header-editorial text-left pb-4">Channel</th>
                <th className="table-header-editorial text-right pb-4">Total Leads</th>
                <th className="table-header-editorial text-right pb-4">Contacted</th>
                <th className="table-header-editorial text-right pb-4">Converted</th>
                <th className="table-header-editorial text-right pb-4">Contact Rate</th>
                <th className="table-header-editorial text-right pb-4">Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {channelData.map((channel) => (
                <tr key={channel.source} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-4 font-medium">{channel.source}</td>
                  <td className="py-4 text-right">{channel.leads}</td>
                  <td className="py-4 text-right">{channel.contacted}</td>
                  <td className="py-4 text-right">{channel.converted}</td>
                  <td className="py-4 text-right">
                    {channel.leads > 0 ? ((channel.contacted / channel.leads) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="py-4 text-right">
                    <Badge
                      className={`rounded-full ${
                        channel.leads > 0 && (channel.converted / channel.leads) >= 0.2
                          ? 'bg-emerald-100 text-emerald-800'
                          : channel.leads > 0 && (channel.converted / channel.leads) >= 0.1
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {channel.leads > 0 ? ((channel.converted / channel.leads) * 100).toFixed(1) : 0}%
                    </Badge>
                  </td>
                </tr>
              ))}
              {channelData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
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

export default AnalyticsPage;
