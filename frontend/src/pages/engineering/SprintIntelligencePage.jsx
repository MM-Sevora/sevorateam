import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle, 
  Calendar, Target, Zap, ArrowRight, ChevronRight, Loader2,
  CheckCircle, Clock, RefreshCw, LineChart, Activity
} from 'lucide-react';
import {
  LineChart as RechartsLineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
  ReferenceLine
} from 'recharts';

const SprintIntelligencePage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [loading, setLoading] = useState(true);

  // Chart data
  const [burndownData, setBurndownData] = useState(null);
  const [velocityData, setVelocityData] = useState(null);
  const [spilloverData, setSpilloverData] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects/list');
      const devProjects = (response.data || []).filter(p => 
        p.project_type === 'development' || p.category === 'engineering'
      );
      setProjects(response.data || []);
      
      // Auto-select first project if none selected
      if (!selectedProjectId && response.data?.length > 0) {
        setSelectedProjectId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, [api, selectedProjectId]);

  const fetchSprints = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const response = await api.get(`/projects/${selectedProjectId}/sprints`);
      setSprints(response.data || []);
      
      // Auto-select active sprint
      const active = response.data?.find(s => s.status === 'active');
      if (active) {
        setSelectedSprintId(active.id);
      } else if (response.data?.length > 0) {
        setSelectedSprintId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  }, [api, selectedProjectId]);

  const fetchBurndown = useCallback(async () => {
    if (!selectedSprintId) return;
    try {
      const response = await api.get(`/engineering/sprints/${selectedSprintId}/burndown`);
      setBurndownData(response.data);
    } catch (error) {
      console.error('Failed to fetch burndown:', error);
      setBurndownData(null);
    }
  }, [api, selectedSprintId]);

  const fetchVelocity = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const response = await api.get(`/engineering/projects/${selectedProjectId}/velocity`);
      setVelocityData(response.data);
    } catch (error) {
      console.error('Failed to fetch velocity:', error);
      setVelocityData(null);
    }
  }, [api, selectedProjectId]);

  const fetchSpillover = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const response = await api.get(`/engineering/projects/${selectedProjectId}/spillover`);
      setSpilloverData(response.data);
    } catch (error) {
      console.error('Failed to fetch spillover:', error);
      setSpilloverData(null);
    }
  }, [api, selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSprints();
      fetchVelocity();
      fetchSpillover();
    }
  }, [selectedProjectId, fetchSprints, fetchVelocity, fetchSpillover]);

  useEffect(() => {
    if (selectedSprintId) {
      fetchBurndown();
    }
  }, [selectedSprintId, fetchBurndown]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProjects();
      setLoading(false);
    };
    loadData();
  }, []);

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'worsening') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'worsening') return 'text-red-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="sprint-intelligence-page">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="hover:text-violet-600 cursor-pointer" onClick={() => navigate('/engineering/sprints')}>
          Engineering
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">Sprint Intelligence</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-600" />
            Sprint Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track velocity, burndown, and spillover metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-56" data-testid="project-selector">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {sprints.length > 0 && (
            <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
              <SelectTrigger className="w-48" data-testid="sprint-selector">
                <SelectValue placeholder="Select Sprint" />
              </SelectTrigger>
              <SelectContent>
                {sprints.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      {s.status === 'active' && <Zap className="w-3 h-3 text-green-500" />}
                      {s.status === 'completed' && <CheckCircle className="w-3 h-3 text-blue-500" />}
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Velocity Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Velocity</p>
                <p className="text-2xl font-bold text-violet-600">
                  {velocityData?.average_velocity || 0}
                </p>
                <p className="text-xs text-gray-500">pts/sprint</p>
              </div>
              <div className="text-right">
                {getTrendIcon(velocityData?.trend)}
                <p className={`text-xs ${getTrendColor(velocityData?.trend)}`}>
                  {velocityData?.trend || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spillover Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Spillover</p>
                <p className="text-2xl font-bold text-amber-600">
                  {spilloverData?.average_spillover_rate || 0}%
                </p>
                <p className="text-xs text-gray-500">incomplete rate</p>
              </div>
              <div className="text-right">
                {getTrendIcon(spilloverData?.trend === 'improving' ? 'improving' : 
                  spilloverData?.trend === 'worsening' ? 'worsening' : 'stable')}
                <p className={`text-xs ${getTrendColor(spilloverData?.trend)}`}>
                  {spilloverData?.trend || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Burndown Progress Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sprint Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {burndownData?.completed_points || 0}/{burndownData?.total_points || 0}
                </p>
                <p className="text-xs text-gray-500">points completed</p>
              </div>
              <Activity className="w-8 h-8 text-blue-200" />
            </div>
            <Progress 
              value={burndownData?.total_points > 0 
                ? (burndownData.completed_points / burndownData.total_points) * 100 
                : 0
              } 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        {/* Sprints Analyzed Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sprints Analyzed</p>
                <p className="text-2xl font-bold">{spilloverData?.total_sprints_analyzed || 0}</p>
                <p className="text-xs text-gray-500">historical data</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="burndown" className="w-full">
        <TabsList>
          <TabsTrigger value="burndown" className="gap-2">
            <LineChart className="w-4 h-4" /> Burndown Chart
          </TabsTrigger>
          <TabsTrigger value="velocity" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Velocity Chart
          </TabsTrigger>
          <TabsTrigger value="spillover" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Spillover Tracking
          </TabsTrigger>
        </TabsList>

        {/* Burndown Chart Tab */}
        <TabsContent value="burndown" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Sprint Burndown</span>
                {burndownData?.sprint_name && (
                  <Badge variant="outline">{burndownData.sprint_name}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {burndownData?.data_points?.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={burndownData.data_points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${Math.round(value)} pts`,
                        name === 'ideal_remaining' ? 'Ideal' : 'Actual'
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="ideal_remaining" 
                      stroke="#94a3b8" 
                      fill="#f1f5f9"
                      strokeDasharray="5 5"
                      name="Ideal"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actual_remaining" 
                      stroke="#8b5cf6" 
                      fill="#ede9fe"
                      name="Actual"
                    />
                    <ReferenceLine y={0} stroke="#22c55e" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <LineChart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p>No burndown data available</p>
                    <p className="text-sm">Select a sprint with tasks to see the burndown chart</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Velocity Chart Tab */}
        <TabsContent value="velocity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Team Velocity (Last {velocityData?.sprints?.length || 0} Sprints)</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Avg: {velocityData?.average_velocity || 0} pts
                  </Badge>
                  {velocityData?.trend && (
                    <Badge className={
                      velocityData.trend === 'improving' ? 'bg-green-100 text-green-700' :
                      velocityData.trend === 'worsening' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {getTrendIcon(velocityData.trend)}
                      <span className="ml-1">{velocityData.trend}</span>
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {velocityData?.sprints?.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={velocityData.sprints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="sprint_name" 
                      tick={{ fontSize: 11 }}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value} pts`,
                        name === 'committed_points' ? 'Committed' : 'Completed'
                      ]}
                    />
                    <Legend />
                    <Bar 
                      dataKey="committed_points" 
                      fill="#e2e8f0" 
                      name="Committed"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="completed_points" 
                      fill="#8b5cf6" 
                      name="Completed"
                      radius={[4, 4, 0, 0]}
                    />
                    <ReferenceLine 
                      y={velocityData.average_velocity} 
                      stroke="#f59e0b" 
                      strokeDasharray="5 5"
                      label={{ value: `Avg: ${velocityData.average_velocity}`, position: 'right', fill: '#f59e0b', fontSize: 12 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p>No velocity data available</p>
                    <p className="text-sm">Complete some sprints to see velocity trends</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spillover Tracking Tab */}
        <TabsContent value="spillover" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Spillover Tracking</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Avg Spillover: {spilloverData?.average_spillover_rate || 0}%
                  </Badge>
                  {spilloverData?.trend && (
                    <Badge className={
                      spilloverData.trend === 'improving' ? 'bg-green-100 text-green-700' :
                      spilloverData.trend === 'worsening' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {getTrendIcon(spilloverData.trend)}
                      <span className="ml-1">{spilloverData.trend}</span>
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {spilloverData?.sprints?.length > 0 ? (
                <div className="space-y-6">
                  {/* Spillover Chart */}
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={spilloverData.sprints.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="sprint_name" 
                        tick={{ fontSize: 11 }}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'spillover_rate' ? `${value}%` : `${value} items`,
                          name === 'spillover_rate' ? 'Spillover Rate' : 
                          name === 'completed_items' ? 'Completed' : 'Incomplete'
                        ]}
                      />
                      <Legend />
                      <Bar 
                        dataKey="completed_items" 
                        fill="#22c55e" 
                        name="Completed"
                        radius={[4, 4, 0, 0]}
                        stackId="items"
                      />
                      <Bar 
                        dataKey="incomplete_items" 
                        fill="#ef4444" 
                        name="Incomplete"
                        radius={[4, 4, 0, 0]}
                        stackId="items"
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Spillover Details */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Sprint Breakdown</h4>
                    {spilloverData.sprints.slice(0, 5).map(sprint => (
                      <div 
                        key={sprint.sprint_id}
                        className="p-3 rounded-lg border hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sprint.sprint_name}</span>
                            <Badge className={
                              sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {sprint.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-600">
                              ✓ {sprint.completed_items}/{sprint.total_items} items
                            </span>
                            <span className="text-gray-500">
                              {sprint.completed_points}/{sprint.total_points} pts
                            </span>
                            {sprint.spillover_rate > 20 && (
                              <Badge className="bg-red-100 text-red-700">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {sprint.spillover_rate}% spillover
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Progress 
                          value={sprint.total_items > 0 
                            ? (sprint.completed_items / sprint.total_items) * 100 
                            : 0
                          } 
                          className="h-2"
                        />
                        
                        {sprint.incomplete_tasks?.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-gray-500 mb-1">Incomplete items:</p>
                            <div className="flex flex-wrap gap-1">
                              {sprint.incomplete_tasks.slice(0, 5).map(task => (
                                <Badge 
                                  key={task.id} 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-violet-50"
                                  onClick={() => navigate(`/projects/${selectedProjectId}?task=${task.id}`)}
                                >
                                  {task.name.substring(0, 30)}{task.name.length > 30 ? '...' : ''}
                                </Badge>
                              ))}
                              {sprint.incomplete_tasks.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{sprint.incomplete_tasks.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p>No spillover data available</p>
                    <p className="text-sm">Complete some sprints to track spillover</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SprintIntelligencePage;
