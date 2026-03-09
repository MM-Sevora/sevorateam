import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, CheckCircle2, Clock, AlertTriangle, Users, 
  TrendingUp, Calendar, RefreshCw, ArrowRight, Flag, BarChart3,
  ListTodo, AlertCircle, UserX, Lock, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', color: 'bg-stone-100 text-stone-600 border-stone-200' }
};

const statusColors = {
  draft: 'bg-stone-100 text-stone-600',
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700'
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <Card className="bg-white border-[#E8D5C4] shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#5D4A3A] text-sm">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color || 'text-[#4A3728]'}`}>{value}</p>
          {subtitle && <p className="text-xs text-[#5D4A3A] mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color ? color.replace('text-', 'bg-').replace('-700', '-100').replace('-600', '-100') : 'bg-rose-100'}`}>
          <Icon className={`w-6 h-6 ${color || 'text-rose-600'}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <TrendingUp className={`w-3 h-3 ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          <span className={trend > 0 ? 'text-emerald-600' : 'text-red-600'}>
            {trend > 0 ? '+' : ''}{trend}% from last week
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

const DonutChart = ({ data, title }) => {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = {
    draft: '#a8a29e',
    active: '#10b981',
    on_hold: '#f59e0b',
    completed: '#3b82f6',
    cancelled: '#ef4444',
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#78716c'
  };
  
  // Calculate percentages and create segments
  let cumulative = 0;
  const segments = Object.entries(data).filter(([_, v]) => v > 0).map(([key, value]) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const start = cumulative;
    cumulative += percentage;
    return { key, value, percentage, start, color: colors[key] || '#8B7355' };
  });

  return (
    <Card className="bg-white border-[#E8D5C4]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#4A3728] text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Simple SVG Donut */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {total > 0 ? segments.map((seg, i) => (
                <circle
                  key={seg.key}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="3"
                  strokeDasharray={`${seg.percentage} ${100 - seg.percentage}`}
                  strokeDashoffset={`${-seg.start}`}
                  className="transition-all duration-500"
                />
              )) : (
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#E8D5C4"
                  strokeWidth="3"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-[#4A3728]">{total}</span>
              <span className="text-xs text-[#5D4A3A]">Total</span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex-1 space-y-2">
            {segments.map(seg => (
              <div key={seg.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-[#4A3728] capitalize">{seg.key.replace('_', ' ')}</span>
                </div>
                <span className="font-medium text-[#4A3728]">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WeeklyChart = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.completed), 1);
  
  return (
    <Card className="bg-white border-[#E8D5C4]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#4A3728] text-base font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-rose-600" />
          Weekly Task Completion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-32">
          {data.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-rose-500 rounded-t transition-all hover:bg-rose-600"
                style={{ 
                  height: `${(day.completed / maxValue) * 100}%`,
                  minHeight: day.completed > 0 ? '8px' : '0'
                }}
                title={`${day.completed} tasks completed`}
              />
              <span className="text-xs text-[#5D4A3A]">{day.date}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center text-sm text-[#5D4A3A]">
          {data.reduce((sum, d) => sum + d.completed, 0)} tasks completed this week
        </div>
      </CardContent>
    </Card>
  );
};

const TeamWorkloadCard = ({ workload, onViewMember }) => (
  <Card className="bg-white border-[#E8D5C4]">
    <CardHeader className="pb-2">
      <CardTitle className="text-[#4A3728] text-base font-semibold flex items-center gap-2">
        <Users className="w-4 h-4 text-rose-600" />
        Team Workload
      </CardTitle>
    </CardHeader>
    <CardContent>
      {workload.length > 0 ? (
        <div className="space-y-4">
          {workload.slice(0, 6).map((member) => {
            const completionRate = member.total_tasks > 0 
              ? Math.round((member.completed_tasks / member.total_tasks) * 100) 
              : 0;
            return (
              <div key={member.user_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#E8D5C4] flex items-center justify-center text-sm font-medium text-[#4A3728]">
                      {member.user_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#4A3728]">{member.user_name}</p>
                      <p className="text-xs text-[#5D4A3A]">
                        {member.total_tasks} tasks • {member.in_progress_tasks} in progress
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#4A3728]">{completionRate}%</p>
                    {member.overdue_tasks > 0 && (
                      <p className="text-xs text-red-600">{member.overdue_tasks} overdue</p>
                    )}
                  </div>
                </div>
                <Progress 
                  value={completionRate} 
                  className="h-2 bg-[#E8D5C4]"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-[#5D4A3A]">
          <Users className="w-12 h-12 mx-auto text-[#D4BBA6] mb-2" />
          <p>No team members with tasks yet</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const AtRiskProjectsCard = ({ projects, onViewProject }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-white border-[#E8D5C4]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#4A3728] text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          At-Risk Projects
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.slice(0, 5).map((project) => (
              <div 
                key={project.id}
                className="p-3 border border-red-200 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => navigate(`/projects/${project.id}`)}
                data-testid={`at-risk-project-${project.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs font-mono">
                        {project.project_id}
                      </Badge>
                      <Badge variant="outline" className={priorityConfig[project.priority]?.color}>
                        <Flag className="w-3 h-3 mr-1" />
                        {project.priority}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-[#4A3728]">{project.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#5D4A3A]">
                      <span>{project.completed_task_count}/{project.task_count} tasks</span>
                      {project.overdue_task_count > 0 && (
                        <span className="text-red-600 font-medium">
                          {project.overdue_task_count} overdue
                        </span>
                      )}
                      {project.end_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#5D4A3A]" />
                </div>
                <div className="mt-2">
                  <Progress value={project.progress} className="h-1.5 bg-red-200" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#5D4A3A]">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
            <p className="font-medium text-emerald-700">All projects on track!</p>
            <p className="text-sm">No at-risk projects found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UpcomingDeadlinesCard = ({ projects }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-white border-[#E8D5C4]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#4A3728] text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.slice(0, 5).map((project) => {
              const daysLeft = Math.ceil(
                (new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div 
                  key={project.id}
                  className="p-3 border border-[#E8D5C4] rounded-lg cursor-pointer hover:bg-[#FDF8F3] transition-colors"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  data-testid={`upcoming-deadline-${project.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-[#E8D5C4] text-[#4A3728] text-xs font-mono">
                          {project.project_id}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-[#4A3728]">{project.name}</h4>
                      <p className="text-xs text-[#5D4A3A] mt-1">
                        {project.progress.toFixed(0)}% complete • {project.completed_task_count}/{project.task_count} tasks
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                      >
                        {daysLeft} days left
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={project.progress} 
                      className="h-1.5 bg-[#E8D5C4]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[#5D4A3A]">
            <Calendar className="w-12 h-12 mx-auto text-[#D4BBA6] mb-2" />
            <p>No upcoming deadlines this week</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RecentActivityCard = ({ activities }) => {
  const getActivityIcon = (action) => {
    switch (action) {
      case 'created': return <FolderKanban className="w-4 h-4 text-emerald-600" />;
      case 'updated': return <Activity className="w-4 h-4 text-blue-600" />;
      case 'status_changed': return <ArrowRight className="w-4 h-4 text-purple-600" />;
      case 'commented': return <ListTodo className="w-4 h-4 text-amber-600" />;
      case 'deleted': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-[#5D4A3A]" />;
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card className="bg-white border-[#E8D5C4]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#4A3728] text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5">{getActivityIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#4A3728]">
                    <span className="font-medium">{activity.user_name || 'Someone'}</span>
                    {' '}{activity.action.replace('_', ' ')}{' '}
                    <span className="font-medium">{activity.entity_name || activity.entity_type}</span>
                  </p>
                  <p className="text-xs text-[#5D4A3A]">{formatTime(activity.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#5D4A3A]">
            <Activity className="w-12 h-12 mx-auto text-[#D4BBA6] mb-2" />
            <p>No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/manager-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" data-testid="manager-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]" data-testid="manager-dashboard-title">
            Manager Dashboard
          </h1>
          <p className="text-[#5D4A3A] mt-1">Project management overview and insights</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchDashboard}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
            data-testid="refresh-dashboard-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate('/projects')}
            className="bg-rose-600 hover:bg-rose-700 text-white"
            data-testid="view-all-projects-btn"
          >
            <FolderKanban className="w-4 h-4 mr-2" />
            All Projects
          </Button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          title="Total Projects" 
          value={data?.total_projects || 0}
          icon={FolderKanban}
          color="text-rose-600"
        />
        <StatCard 
          title="Active" 
          value={data?.active_projects || 0}
          icon={CheckCircle2}
          color="text-emerald-600"
        />
        <StatCard 
          title="Completed" 
          value={data?.completed_projects || 0}
          icon={CheckCircle2}
          color="text-blue-600"
        />
        <StatCard 
          title="On Hold" 
          value={data?.on_hold_projects || 0}
          icon={Clock}
          color="text-amber-600"
        />
        <StatCard 
          title="At Risk" 
          value={data?.at_risk_projects || 0}
          icon={AlertTriangle}
          color="text-red-600"
        />
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          title="Total Tasks" 
          value={data?.total_tasks || 0}
          icon={ListTodo}
          color="text-[#4A3728]"
        />
        <StatCard 
          title="Completed" 
          value={data?.completed_tasks || 0}
          subtitle={data?.total_tasks > 0 ? `${Math.round((data.completed_tasks / data.total_tasks) * 100)}% done` : null}
          icon={CheckCircle2}
          color="text-emerald-600"
        />
        <StatCard 
          title="Overdue" 
          value={data?.overdue_tasks || 0}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <StatCard 
          title="Unassigned" 
          value={data?.unassigned_tasks || 0}
          icon={UserX}
          color="text-amber-600"
        />
        <StatCard 
          title="Blocked" 
          value={data?.blocked_tasks || 0}
          icon={Lock}
          color="text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DonutChart data={data?.projects_by_status || {}} title="Projects by Status" />
        <DonutChart data={data?.projects_by_priority || {}} title="Projects by Priority" />
        <WeeklyChart data={data?.weekly_completion || []} />
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TeamWorkloadCard workload={data?.team_workload || []} />
        <AtRiskProjectsCard projects={data?.at_risk_project_list || []} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlinesCard projects={data?.upcoming_deadlines || []} />
        <RecentActivityCard activities={data?.recent_activity || []} />
      </div>
    </div>
  );
};

export default ManagerDashboard;
