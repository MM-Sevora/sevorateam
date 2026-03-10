import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { 
  Users, CheckCircle2, Clock, AlertTriangle, FolderKanban,
  Target, Calendar, TrendingUp, RefreshCw, ChevronRight,
  UserPlus, BarChart3, PieChart, Activity, Bell, Loader2,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL;

// Color palette
const COLORS = {
  primary: '#4A3728',
  secondary: '#8B7355',
  accent: '#D4BBA6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6'
};

const STATUS_COLORS = {
  active: '#10B981',
  completed: '#6366F1',
  on_hold: '#F59E0B',
  draft: '#9CA3AF',
  at_risk: '#EF4444'
};

const TeamDashboard = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [productivityData, setProductivityData] = useState([]);
  const [workloadData, setWorkloadData] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, productivityRes, workloadRes, activityRes] = await Promise.all([
        api.get('/analytics/dashboard-summary'),
        api.get(`/analytics/productivity-trends?period=${selectedPeriod}`),
        api.get('/analytics/workload-distribution?limit=10'),
        api.get('/analytics/activity-feed?limit=15')
      ]);

      setDashboardData(summaryRes.data);
      setProductivityData(productivityRes.data.data || []);
      setWorkloadData(workloadRes.data || []);
      setActivityFeed(activityRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric' 
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto text-[#8B7355] animate-spin mb-4" />
          <p className="text-[#5D4A3A]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { team_overview, task_summary, project_summary, upcoming_deadlines, todays_meetings, goal_progress } = dashboardData || {};

  // Prepare pie chart data
  const projectStatusData = [
    { name: 'Active', value: project_summary?.active || 0, color: STATUS_COLORS.active },
    { name: 'Completed', value: project_summary?.completed || 0, color: STATUS_COLORS.completed },
    { name: 'On Hold', value: project_summary?.on_hold || 0, color: STATUS_COLORS.on_hold },
    { name: 'At Risk', value: project_summary?.at_risk || 0, color: STATUS_COLORS.at_risk }
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto" data-testid="team-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#4A3728]" data-testid="dashboard-title">
            Team Dashboard
          </h1>
          <p className="text-[#5D4A3A] mt-1">Real-time overview of team performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-36 bg-white border-[#D4BBA6]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-[#D4BBA6]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Team Overview */}
        <Card className="bg-gradient-to-br from-[#4A3728] to-[#6B5D52] text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Team</p>
                <p className="text-3xl font-bold mt-1">{team_overview?.total_employees || 0}</p>
                <p className="text-white/60 text-xs mt-2 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  {team_overview?.new_employees_this_month || 0} new this month
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Total Tasks</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{task_summary?.total_tasks || 0}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-emerald-600 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />{task_summary?.completed || 0}
                  </span>
                  <span className="text-amber-600 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />{task_summary?.in_progress || 0}
                  </span>
                  <span className="text-red-600 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />{task_summary?.overdue || 0}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Projects</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{project_summary?.total_projects || 0}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                    {project_summary?.active || 0} Active
                  </Badge>
                  {project_summary?.at_risk > 0 && (
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      {project_summary.at_risk} At Risk
                    </Badge>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Goal Progress</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">
                  {goal_progress?.overall_progress || 0}%
                </p>
                <div className="mt-2">
                  <Progress value={goal_progress?.overall_progress || 0} className="h-2" />
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Trends */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#8B7355]" />
                Productivity Trends
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {productivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={productivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => formatDate(d)}
                    stroke="#8B7355"
                    fontSize={12}
                  />
                  <YAxis stroke="#8B7355" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FDF8F3', 
                      border: '1px solid #E8D5C4',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(d) => formatDate(d)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tasks_completed" 
                    name="Completed"
                    stroke={COLORS.success} 
                    strokeWidth={2}
                    dot={{ fill: COLORS.success, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tasks_created" 
                    name="Created"
                    stroke={COLORS.info} 
                    strokeWidth={2}
                    dot={{ fill: COLORS.info, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-[#8B7355]">
                <p>No productivity data for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Status Breakdown */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#8B7355]" />
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPie>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-[#8B7355]">
                <p>No projects to display</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workload Distribution */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#8B7355]" />
            Team Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workloadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis type="number" stroke="#8B7355" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="user_name" 
                  width={120}
                  stroke="#8B7355" 
                  fontSize={12}
                  tickFormatter={(name) => name.length > 15 ? name.slice(0, 15) + '...' : name}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FDF8F3', 
                    border: '1px solid #E8D5C4',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill={COLORS.success} stackId="a" />
                <Bar dataKey="in_progress" name="In Progress" fill={COLORS.info} stackId="a" />
                <Bar dataKey="overdue" name="Overdue" fill={COLORS.danger} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#8B7355]">
              <p>No workload data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Deadlines, Meetings, Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Upcoming Deadlines
              </CardTitle>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {upcoming_deadlines?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            {upcoming_deadlines && upcoming_deadlines.length > 0 ? (
              <div className="space-y-3">
                {upcoming_deadlines.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4] hover:border-[#D4BBA6] transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/tasks/${item.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#4A3728] text-sm truncate">{item.title}</p>
                        {item.project_name && (
                          <p className="text-xs text-[#8B7355] mt-0.5">{item.project_name}</p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${
                          item.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                          item.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-[#F5EBE0] text-[#5D4A3A]'
                        }`}
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-[#8B7355]">
                      <span>{item.assignee_name || 'Unassigned'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.due_date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B7355]">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p>No upcoming deadlines</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Meetings */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Meetings
              </CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {todays_meetings?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            {todays_meetings && todays_meetings.length > 0 ? (
              <div className="space-y-3">
                {todays_meetings.map((meeting) => (
                  <div 
                    key={meeting.id}
                    className="p-3 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4] hover:border-[#D4BBA6] transition-colors cursor-pointer"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-[#4A3728] text-sm flex-1 truncate">{meeting.title}</p>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs capitalize ${
                          meeting.status === 'in_progress' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-[#F5EBE0] text-[#5D4A3A]'
                        }`}
                      >
                        {meeting.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-[#8B7355]">
                      <span className="capitalize">{meeting.meeting_type.replace('_', ' ')}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {meeting.participants_count}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {formatDateTime(meeting.start_time)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B7355]">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-[#D4BBA6]" />
                <p>No meetings scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                Recent Activity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            {activityFeed && activityFeed.length > 0 ? (
              <div className="space-y-3">
                {activityFeed.map((activity, idx) => (
                  <div 
                    key={`${activity.id}-${idx}`}
                    className="flex items-start gap-3 p-2 hover:bg-[#FDF8F3] rounded-lg transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.module === 'tasks' ? 'bg-blue-100' :
                      activity.module === 'meetings' ? 'bg-purple-100' :
                      'bg-[#F5EBE0]'
                    }`}>
                      {activity.module === 'tasks' ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : activity.module === 'meetings' ? (
                        <Calendar className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Activity className="w-4 h-4 text-[#8B7355]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#4A3728] line-clamp-2">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#8B7355]">
                        <span>{activity.user_name}</span>
                        <span>•</span>
                        <span>{formatDateTime(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B7355]">
                <Activity className="w-10 h-10 mx-auto mb-2 text-[#D4BBA6]" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Projects List */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-[#8B7355]" />
              Active Projects
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/projects')}
              className="text-[#8B7355] hover:text-[#4A3728]"
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {project_summary?.projects && project_summary.projects.length > 0 ? (
            <div className="space-y-3">
              {project_summary.projects.slice(0, 5).map((project) => (
                <div 
                  key={project.id}
                  className="flex items-center gap-4 p-3 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4] hover:border-[#D4BBA6] transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#4A3728] truncate">{project.name}</p>
                      {project.project_id && (
                        <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A] text-xs">
                          {project.project_id}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#8B7355] mt-0.5">{project.owner_name || 'No owner'}</p>
                  </div>
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs text-[#5D4A3A] mb-1">
                      <span>Progress</span>
                      <span>{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-2" />
                  </div>
                  <Badge 
                    variant="outline"
                    className={`capitalize ${
                      project.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      project.status === 'on_hold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-[#F5EBE0] text-[#5D4A3A]'
                    }`}
                  >
                    {project.status}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-[#D4BBA6]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#8B7355]">
              <FolderKanban className="w-10 h-10 mx-auto mb-2 text-[#D4BBA6]" />
              <p>No active projects</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDashboard;
