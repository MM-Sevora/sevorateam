import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Minus, Target, Calendar, BarChart3,
  Layers, ChevronRight, Activity, CheckCircle2, Clock, Users
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const EngineeringReportsPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  
  const [burndownData, setBurndownData] = useState(null);
  const [velocityData, setVelocityData] = useState(null);
  const [issueStats, setIssueStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects/list');
      setProjects(response.data || []);
      if (response.data?.length > 0) {
        setSelectedProject(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, [api]);

  const fetchSprints = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const response = await api.get(`/projects/${selectedProject}/sprints`);
      setSprints(response.data || []);
      // Auto-select most recent active sprint
      const activeSprint = response.data?.find(s => s.status === 'active');
      if (activeSprint) {
        setSelectedSprint(activeSprint.id);
      } else if (response.data?.length > 0) {
        setSelectedSprint(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  }, [api, selectedProject]);

  const fetchBurndown = useCallback(async () => {
    if (!selectedSprint) return;
    try {
      const response = await api.get(`/engineering/sprints/${selectedSprint}/burndown`);
      setBurndownData(response.data);
    } catch (error) {
      console.error('Failed to fetch burndown:', error);
      setBurndownData(null);
    }
  }, [api, selectedSprint]);

  const fetchVelocity = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const response = await api.get(`/engineering/projects/${selectedProject}/velocity?sprint_count=10`);
      setVelocityData(response.data);
    } catch (error) {
      console.error('Failed to fetch velocity:', error);
      setVelocityData(null);
    }
  }, [api, selectedProject]);

  const fetchIssueStats = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const response = await api.get(`/engineering/projects/${selectedProject}/issue-stats`);
      setIssueStats(response.data);
    } catch (error) {
      console.error('Failed to fetch issue stats:', error);
      setIssueStats(null);
    }
  }, [api, selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      fetchSprints();
      fetchVelocity();
      fetchIssueStats();
    }
  }, [selectedProject, fetchSprints, fetchVelocity, fetchIssueStats]);

  useEffect(() => {
    if (selectedSprint) {
      fetchBurndown();
    }
  }, [selectedSprint, fetchBurndown]);

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const issueTypeColors = {
    epic: '#8B5CF6',
    story: '#10B981',
    task: '#3B82F6',
    bug: '#EF4444',
    subtask: '#6B7280',
    improvement: '#F59E0B',
    spike: '#6366F1'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="engineering-reports-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span 
              className="hover:text-blue-600 cursor-pointer"
              onClick={() => navigate('/projects/list')}
            >
              Projects
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Engineering Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Reports & Charts
          </h1>
          <p className="text-gray-500 mt-1">
            Sprint burndown, team velocity, and issue analytics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      {issueStats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                  <p className="text-2xl font-bold">{issueStats.task?.total || 0}</p>
                  <p className="text-xs text-green-600">{issueStats.task?.completed || 0} completed</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stories</p>
                  <p className="text-2xl font-bold">{issueStats.story?.total || 0}</p>
                  <p className="text-xs text-green-600">{issueStats.story?.completed || 0} completed</p>
                </div>
                <Layers className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Bugs</p>
                  <p className="text-2xl font-bold text-red-600">{issueStats.bug?.total || 0}</p>
                  <p className="text-xs text-green-600">{issueStats.bug?.completed || 0} fixed</p>
                </div>
                <Activity className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Epics</p>
                  <p className="text-2xl font-bold">{issueStats.epic?.total || 0}</p>
                  <p className="text-xs text-green-600">{issueStats.epic?.completed || 0} done</p>
                </div>
                <Target className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Burndown Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Sprint Burndown
              </CardTitle>
              <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="Select Sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {burndownData?.data_points?.length > 0 ? (
              <div>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>Ideal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Actual</span>
                  </div>
                  <div className="ml-auto">
                    <Badge variant="outline">
                      {burndownData.completed_story_points}/{burndownData.total_story_points} pts
                    </Badge>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={burndownData.data_points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value, name) => [value.toFixed(1), name]}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ideal_remaining" 
                      stroke="#3B82F6" 
                      fill="#DBEAFE"
                      strokeWidth={2}
                      name="Ideal"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actual_remaining" 
                      stroke="#10B981" 
                      fill="#D1FAE5"
                      strokeWidth={2}
                      name="Actual"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                {selectedSprint ? 'No burndown data available for this sprint' : 'Select a sprint to view burndown'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Velocity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Team Velocity
              </CardTitle>
              {velocityData && (
                <div className="flex items-center gap-2">
                  {getTrendIcon(velocityData.trend)}
                  <Badge variant="outline">
                    Avg: {velocityData.average_velocity?.toFixed(1)} pts/sprint
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {velocityData?.sprints?.length > 0 ? (
              <div>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>Committed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Completed</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={velocityData.sprints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="sprint_name" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="committed_points" 
                      fill="#93C5FD" 
                      name="Committed"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="completed_points" 
                      fill="#10B981" 
                      name="Completed"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No completed sprints yet. Velocity data will appear after sprints are completed.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issue Distribution */}
      {issueStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Issue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {Object.entries(issueStats).map(([type, stats]) => (
                <div 
                  key={type}
                  className="p-4 rounded-lg border text-center hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderColor: issueTypeColors[type] + '40' }}
                  onClick={() => navigate(`/projects/${selectedProject}/backlog?issue_type=${type}`)}
                >
                  <div 
                    className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: issueTypeColors[type] + '20' }}
                  >
                    <span 
                      className="text-lg font-bold"
                      style={{ color: issueTypeColors[type] }}
                    >
                      {stats.total}
                    </span>
                  </div>
                  <p className="text-sm font-medium capitalize">{type}</p>
                  <p className="text-xs text-gray-500">{stats.completed} done</p>
                  {stats.story_points > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{stats.story_points} pts</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprint Summary (if burndown available) */}
      {burndownData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Sprint: {burndownData.sprint_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">
                  {new Date(burndownData.start_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium">
                  {new Date(burndownData.end_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Story Points</p>
                <p className="font-medium">{burndownData.total_story_points}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="font-medium text-green-600">
                  {burndownData.completed_story_points} ({burndownData.total_story_points > 0 
                    ? Math.round(burndownData.completed_story_points / burndownData.total_story_points * 100) 
                    : 0}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EngineeringReportsPage;
