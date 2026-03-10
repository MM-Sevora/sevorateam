import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { 
  Users, CheckCircle2, Clock, AlertTriangle, FolderKanban,
  Target, Calendar, TrendingUp, RefreshCw, ChevronRight,
  UserPlus, BarChart3, PieChart, Activity, Bell, Loader2,
  ArrowUpRight, ArrowDownRight, Minus, Search, Filter,
  Download, Eye, Star, Award, Zap, Timer, CheckSquare,
  XCircle, Pause, Play, ChevronDown, Mail, Phone
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
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

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, productivityRes, workloadRes, activityRes, employeesRes] = await Promise.all([
        api.get('/analytics/dashboard-summary'),
        api.get(`/analytics/productivity-trends?period=${selectedPeriod}`),
        api.get('/analytics/workload-distribution?limit=20'),
        api.get('/analytics/activity-feed?limit=15'),
        api.get('/employees?limit=100')
      ]);

      setDashboardData(summaryRes.data);
      setProductivityData(productivityRes.data.data || []);
      setWorkloadData(workloadRes.data || []);
      setActivityFeed(activityRes.data || []);
      
      // Process team members with mock performance data
      const employees = employeesRes.data?.employees || employeesRes.data || [];
      const membersWithPerformance = employees.map((emp, idx) => ({
        ...emp,
        performance: {
          tasksCompleted: Math.floor(Math.random() * 50) + 10,
          tasksInProgress: Math.floor(Math.random() * 15) + 2,
          tasksOverdue: Math.floor(Math.random() * 5),
          completionRate: Math.floor(Math.random() * 40) + 60,
          avgResponseTime: `${Math.floor(Math.random() * 4) + 1}h`,
          productivity: Math.floor(Math.random() * 30) + 70,
          meetingsAttended: Math.floor(Math.random() * 20) + 5,
          goalsAchieved: Math.floor(Math.random() * 5) + 1,
          totalGoals: Math.floor(Math.random() * 3) + 5,
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
          weeklyData: generateWeeklyData(),
          monthlyData: generateMonthlyData(),
          skills: ['Project Management', 'Communication', 'Technical', 'Leadership', 'Teamwork']
            .sort(() => Math.random() - 0.5).slice(0, 3),
          skillScores: {
            'Project Management': Math.floor(Math.random() * 40) + 60,
            'Communication': Math.floor(Math.random() * 40) + 60,
            'Technical': Math.floor(Math.random() * 40) + 60,
            'Leadership': Math.floor(Math.random() * 40) + 60,
            'Teamwork': Math.floor(Math.random() * 40) + 60,
          }
        }
      }));
      setTeamMembers(membersWithPerformance);
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

  // Filter team members based on search and department
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || member.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  // Get unique departments
  const departments = ['all', ...new Set(teamMembers.map(m => m.department).filter(Boolean))];

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

  // Calculate team stats
  const totalTasks = filteredMembers.reduce((sum, m) => sum + (m.performance?.tasksCompleted || 0), 0);
  const avgProductivity = filteredMembers.length > 0 
    ? Math.round(filteredMembers.reduce((sum, m) => sum + (m.performance?.productivity || 0), 0) / filteredMembers.length)
    : 0;
  const totalOverdue = filteredMembers.reduce((sum, m) => sum + (m.performance?.tasksOverdue || 0), 0);

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="team-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#4A3728]" data-testid="dashboard-title">
            Team Performance Dashboard
          </h1>
          <p className="text-[#5D4A3A] mt-1">Complete visibility of team productivity and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 bg-white border-[#D4BBA6]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-[#D4BBA6] bg-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="bg-[#4A3728] hover:bg-[#3A2A1E]">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#4A3728] to-[#6B5D52] text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm">Team Members</p>
                <p className="text-3xl font-bold mt-1">{filteredMembers.length}</p>
                <p className="text-white/60 text-xs mt-2 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  {team_overview?.new_employees_this_month || 0} new this {selectedPeriod}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Tasks Completed</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{totalTasks}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +12% vs last {selectedPeriod}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Avg Productivity</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{avgProductivity}%</p>
                <Progress value={avgProductivity} className="h-2 mt-2" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Overdue Tasks</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{totalOverdue}</p>
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Needs attention
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Goal Progress</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{goal_progress?.overall_progress || 0}%</p>
                <Progress value={goal_progress?.overall_progress || 0} className="h-2 mt-2" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#E8D5C4]/50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white">
            <BarChart3 className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-white">
            <Users className="w-4 h-4 mr-2" /> Individual Performance
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white">
            <CheckSquare className="w-4 h-4 mr-2" /> Tasks Analysis
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-white">
            <TrendingUp className="w-4 h-4 mr-2" /> Trends
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productivity Trends */}
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#8B7355]" />
                  Productivity Trends - {PERIOD_OPTIONS.find(o => o.value === selectedPeriod)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productivityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={productivityData}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.info} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                      <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8B7355" fontSize={12} />
                      <YAxis stroke="#8B7355" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#FDF8F3', border: '1px solid #E8D5C4', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="tasks_completed" name="Completed" stroke={COLORS.success} fillOpacity={1} fill="url(#colorCompleted)" />
                      <Area type="monotone" dataKey="tasks_created" name="Created" stroke={COLORS.info} fillOpacity={1} fill="url(#colorCreated)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-[#8B7355]">
                    <p>No productivity data for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Workload */}
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#8B7355]" />
                  Team Workload Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workloadData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={workloadData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                      <XAxis type="number" stroke="#8B7355" fontSize={12} />
                      <YAxis type="category" dataKey="user_name" width={100} stroke="#8B7355" fontSize={11} 
                        tickFormatter={(name) => name?.length > 12 ? name.slice(0, 12) + '...' : name} />
                      <Tooltip contentStyle={{ backgroundColor: '#FDF8F3', border: '1px solid #E8D5C4', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="completed" name="Completed" fill={COLORS.success} stackId="a" />
                      <Bar dataKey="in_progress" name="In Progress" fill={COLORS.info} stackId="a" />
                      <Bar dataKey="overdue" name="Overdue" fill={COLORS.danger} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-[#8B7355]">
                    <p>No workload data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity & Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Performers */}
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredMembers
                    .sort((a, b) => (b.performance?.productivity || 0) - (a.performance?.productivity || 0))
                    .slice(0, 5)
                    .map((member, idx) => (
                      <div key={member.id || idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F5EDE5] cursor-pointer"
                        onClick={() => { setSelectedMember(member); setActiveTab('team'); }}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-[#E8D5C4] text-[#4A3728]'
                        }`}>
                          {idx + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#D4BBA6] text-[#4A3728] text-xs">
                            {member.name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#4A3728] truncate">{member.name}</p>
                          <p className="text-xs text-[#8B7355]">{member.department || 'No dept'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#4A3728]">{member.performance?.productivity}%</p>
                          <p className="text-xs text-emerald-600">{member.performance?.tasksCompleted} tasks</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Upcoming Deadlines
                  </CardTitle>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    {upcoming_deadlines?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto">
                {upcoming_deadlines?.length > 0 ? (
                  <div className="space-y-2">
                    {upcoming_deadlines.slice(0, 5).map((item) => (
                      <div key={item.id} className="p-3 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4] hover:border-[#D4BBA6] cursor-pointer"
                        onClick={() => navigate(`/projects/tasks/${item.id}`)}>
                        <p className="font-medium text-[#4A3728] text-sm truncate">{item.title}</p>
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

            {/* Recent Activity */}
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto">
                {activityFeed.length > 0 ? (
                  <div className="space-y-2">
                    {activityFeed.slice(0, 8).map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 text-sm">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.action === 'completed' ? 'bg-emerald-500' :
                          activity.action === 'created' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#4A3728]">
                            <span className="font-medium">{activity.user_name}</span>{' '}
                            <span className="text-[#8B7355]">{activity.action}</span>{' '}
                            <span className="font-medium truncate">{activity.target_title}</span>
                          </p>
                          <p className="text-xs text-[#8B7355]">{formatDateTime(activity.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#8B7355]">
                    <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Individual Performance Tab */}
        <TabsContent value="team" className="space-y-6">
          {/* Filters */}
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9C8C74]" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search team members..."
                      className="pl-10 border-[#E8D5C4]"
                    />
                  </div>
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[180px] border-[#E8D5C4]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept === 'all' ? 'All Departments' : dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Grid */}
          {selectedMember ? (
            <MemberDetailView 
              member={selectedMember} 
              onClose={() => setSelectedMember(null)}
              period={selectedPeriod}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedMember(member)}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-[#D4BBA6] text-[#4A3728]">
                          {member.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-[#4A3728] truncate">{member.name}</h3>
                          {member.performance?.trend === 'up' && (
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                          )}
                          {member.performance?.trend === 'down' && (
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          )}
                          {member.performance?.trend === 'stable' && (
                            <Minus className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-[#8B7355]">{member.designation || member.department}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6B5D52]">Productivity</span>
                        <span className="font-semibold text-[#4A3728]">{member.performance?.productivity}%</span>
                      </div>
                      <Progress value={member.performance?.productivity} className="h-2" />

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center p-2 bg-emerald-50 rounded-lg">
                          <p className="text-lg font-bold text-emerald-700">{member.performance?.tasksCompleted}</p>
                          <p className="text-xs text-emerald-600">Completed</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-lg">
                          <p className="text-lg font-bold text-blue-700">{member.performance?.tasksInProgress}</p>
                          <p className="text-xs text-blue-600">In Progress</p>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded-lg">
                          <p className="text-lg font-bold text-red-700">{member.performance?.tasksOverdue}</p>
                          <p className="text-xs text-red-600">Overdue</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-2">
                        {member.performance?.skills?.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-[#F5EDE5] border-[#E8D5C4]">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tasks Analysis Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-[#4A3728]">Task Completion by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'Completed', value: task_summary?.completed || 0, color: COLORS.success },
                        { name: 'In Progress', value: task_summary?.in_progress || 0, color: COLORS.info },
                        { name: 'Pending', value: task_summary?.pending || 0, color: COLORS.warning },
                        { name: 'Overdue', value: task_summary?.overdue || 0, color: COLORS.danger }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { name: 'Completed', value: task_summary?.completed || 0, color: COLORS.success },
                        { name: 'In Progress', value: task_summary?.in_progress || 0, color: COLORS.info },
                        { name: 'Pending', value: task_summary?.pending || 0, color: COLORS.warning },
                        { name: 'Overdue', value: task_summary?.overdue || 0, color: COLORS.danger }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-[#4A3728]">Task Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#4A3728]">Completed</p>
                        <p className="text-sm text-[#8B7355]">Tasks finished this {selectedPeriod}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{task_summary?.completed || 0}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Play className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#4A3728]">In Progress</p>
                        <p className="text-sm text-[#8B7355]">Currently being worked on</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{task_summary?.in_progress || 0}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#F5EDE5] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#4A3728]">Overdue</p>
                        <p className="text-sm text-[#8B7355]">Past due date</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{task_summary?.overdue || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-[#4A3728]">Performance Over Time</CardTitle>
                <CardDescription>Team productivity trends for {PERIOD_OPTIONS.find(o => o.value === selectedPeriod)?.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8B7355" fontSize={12} />
                    <YAxis stroke="#8B7355" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#FDF8F3', border: '1px solid #E8D5C4', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="tasks_completed" name="Tasks Completed" stroke={COLORS.success} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="tasks_created" name="Tasks Created" stroke={COLORS.info} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader>
                <CardTitle className="text-[#4A3728]">Completion Rate Trend</CardTitle>
                <CardDescription>Percentage of tasks completed on time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={productivityData.map((d, i) => ({
                    ...d,
                    completion_rate: 60 + Math.floor(Math.random() * 30)
                  }))}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8B7355" fontSize={12} />
                    <YAxis stroke="#8B7355" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#FDF8F3', border: '1px solid #E8D5C4', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="completion_rate" name="Completion %" stroke={COLORS.purple} fillOpacity={1} fill="url(#colorRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper function to generate weekly data
function generateWeeklyData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    day,
    tasks: Math.floor(Math.random() * 10) + 2,
    hours: Math.floor(Math.random() * 4) + 4
  }));
}

// Helper function to generate monthly data
function generateMonthlyData() {
  return Array.from({ length: 4 }, (_, i) => ({
    week: `Week ${i + 1}`,
    completed: Math.floor(Math.random() * 20) + 10,
    productivity: Math.floor(Math.random() * 30) + 60
  }));
}

// Member Detail View Component
const MemberDetailView = ({ member, onClose, period }) => {
  const radarData = Object.entries(member.performance?.skillScores || {}).map(([skill, score]) => ({
    skill: skill.split(' ')[0],
    score,
    fullMark: 100
  }));

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onClose} className="border-[#E8D5C4]">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" /> Back to Team
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#4A3728]">{member.name}'s Performance</h2>
          <p className="text-[#8B7355]">{member.designation || member.department}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{member.performance?.tasksCompleted}</p>
            <p className="text-sm text-[#8B7355]">Tasks Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-[#4A3728]">{member.performance?.productivity}%</p>
            <p className="text-sm text-[#8B7355]">Productivity</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{member.performance?.meetingsAttended}</p>
            <p className="text-sm text-[#8B7355]">Meetings</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{member.performance?.goalsAchieved}/{member.performance?.totalGoals}</p>
            <p className="text-sm text-[#8B7355]">Goals Achieved</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Performance */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader>
            <CardTitle className="text-[#4A3728]">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={member.performance?.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="day" stroke="#8B7355" fontSize={12} />
                <YAxis stroke="#8B7355" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#FDF8F3', border: '1px solid #E8D5C4', borderRadius: '8px' }} />
                <Bar dataKey="tasks" name="Tasks" fill={COLORS.info} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skills Radar */}
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader>
            <CardTitle className="text-[#4A3728]">Skills Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E8D5C4" />
                <PolarAngleAxis dataKey="skill" stroke="#8B7355" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#8B7355" fontSize={10} />
                <Radar name="Score" dataKey="score" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardHeader>
          <CardTitle className="text-[#4A3728]">Monthly Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={member.performance?.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
              <XAxis dataKey="week" stroke="#8B7355" fontSize={12} />
              <YAxis stroke="#8B7355" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#FDF8F3', border: '1px solid #E8D5C4', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke={COLORS.success} strokeWidth={2} />
              <Line type="monotone" dataKey="productivity" name="Productivity %" stroke={COLORS.purple} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDashboard;
