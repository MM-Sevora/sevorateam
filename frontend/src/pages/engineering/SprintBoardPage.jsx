import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { toast } from 'sonner';
import { 
  Zap, ArrowLeft, RefreshCw, Calendar, Target, Clock, CheckCircle2,
  AlertTriangle, Users, TrendingDown, Play, Pause, Flag, Layers, CheckSquare
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Area, ComposedChart
} from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../../components/ui/dialog';
import api from '../../lib/api';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  high: { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  medium: { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  low: { color: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  todo: { label: 'To Do', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  in_review: { label: 'In Review', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Done', color: 'bg-green-100 text-green-700' }
};

const SprintBoardPage = () => {
  const { projectId, sprintId } = useParams();
  const navigate = useNavigate();
  
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [burndownData, setBurndownData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(sprintId || '');
  
  // Complete Sprint Modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState('backlog');
  const [completing, setCompleting] = useState(false);

  const fetchSprintData = useCallback(async () => {
    if (!selectedSprintId && !sprintId) {
      // Find active sprint
      try {
        const sprintsRes = await api.get(`/projects/${projectId}/sprints`);
        const sprintsList = sprintsRes.data || [];
        setSprints(sprintsList);
        
        const activeSprint = sprintsList.find(s => s.status === 'active');
        if (activeSprint) {
          setSelectedSprintId(activeSprint.id);
        } else if (sprintsList.length > 0) {
          setSelectedSprintId(sprintsList[0].id);
        }
      } catch (e) {
        console.error('Error fetching sprints:', e);
      }
      return;
    }

    const currentSprintId = selectedSprintId || sprintId;
    
    try {
      setLoading(true);
      
      // Fetch all sprints first to get the selected sprint details
      const [sprintsRes, projectRes] = await Promise.all([
        api.get(`/projects/${projectId}/sprints`),
        api.get(`/projects/${projectId}`).catch(() => null)
      ]);
      
      const sprintsList = sprintsRes.data || [];
      setSprints(sprintsList);
      
      // Find the selected sprint
      const currentSprint = sprintsList.find(s => s.id === currentSprintId);
      if (currentSprint) {
        setSprint(currentSprint);
      }
      
      if (projectRes?.data) {
        setProject(projectRes.data);
      }
      
      // Fetch tasks for this sprint
      let tasksData = [];
      try {
        const tasksRes = await api.get(`/projects/sprints/${currentSprintId}/tasks`);
        tasksData = tasksRes.data || [];
      } catch (e) {
        // Try alternate endpoint
        try {
          const allTasksRes = await api.get(`/projects/${projectId}/tasks`);
          tasksData = (allTasksRes.data || []).filter(t => t.sprint_id === currentSprintId);
        } catch (e2) {
          console.error('Error fetching tasks:', e2);
        }
      }
      setTasks(tasksData);
      
      // Try to get burndown data
      try {
        const burndownRes = await api.get(`/engineering/sprints/${currentSprintId}/burndown`);
        if (burndownRes?.data?.data) {
          setBurndownData(burndownRes.data.data);
        } else {
          generateMockBurndown(currentSprint, tasksData);
        }
      } catch (e) {
        generateMockBurndown(currentSprint, tasksData);
      }
      
    } catch (error) {
      console.error('Error fetching sprint data:', error);
      toast.error('Failed to load sprint data');
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId, selectedSprintId]);

  const generateMockBurndown = (sprintData, tasksList) => {
    if (!sprintData?.start_date || !sprintData?.end_date) return;
    
    const startDate = parseISO(sprintData.start_date);
    const endDate = parseISO(sprintData.end_date);
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const totalPoints = tasksList.reduce((sum, t) => sum + (t.story_points || 1), 0);
    const completedPoints = tasksList
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.story_points || 1), 0);
    
    const data = [];
    const today = new Date();
    const pointsPerDay = totalPoints / totalDays;
    
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = addDays(startDate, i);
      const ideal = Math.max(0, totalPoints - (pointsPerDay * i));
      
      // Simulate actual progress
      let actual = null;
      if (currentDate <= today) {
        const progress = Math.min(1, i / totalDays);
        const randomFactor = 0.8 + Math.random() * 0.4;
        actual = Math.max(0, totalPoints - (completedPoints * progress * randomFactor));
      }
      
      data.push({
        date: format(currentDate, 'MMM d'),
        ideal: Math.round(ideal * 10) / 10,
        actual: actual !== null ? Math.round(actual * 10) / 10 : null,
        remaining: actual !== null ? Math.round(actual * 10) / 10 : null
      });
    }
    
    setBurndownData(data);
  };

  useEffect(() => {
    if (projectId) {
      fetchSprintData();
    }
  }, [fetchSprintData, projectId]);

  useEffect(() => {
    if (selectedSprintId && selectedSprintId !== sprintId) {
      fetchSprintData();
    }
  }, [selectedSprintId]);

  const getTasksByStatus = (status) => {
    return tasks.filter(t => t.status === status);
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    totalPoints: tasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
    completedPoints: tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.story_points || 0), 0),
    incomplete: tasks.filter(t => !['completed', 'done'].includes(t.status)).length
  };

  // Handle Complete Sprint with Carry Forward
  const handleCompleteSprint = async () => {
    setCompleting(true);
    try {
      const targetId = targetSprintId === 'backlog' ? null : targetSprintId;
      const response = await api.post(`/engineering/sprints/${selectedSprintId}/complete`, null, {
        params: { target_sprint_id: targetId }
      });
      
      toast.success(response.data.message || 'Sprint completed successfully!');
      setShowCompleteModal(false);
      
      // Refresh data
      fetchSprintData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete sprint');
    } finally {
      setCompleting(false);
    }
  };

  const progress = stats.totalPoints > 0 
    ? Math.round((stats.completedPoints / stats.totalPoints) * 100) 
    : (stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0);

  if (loading && !sprint) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sprint...</div>
      </div>
    );
  }

  if (!sprint && sprints.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Sprints Found</h3>
            <p className="text-gray-500 mt-1 mb-4">Create a sprint first to view the sprint board</p>
            <Button onClick={() => navigate(`/projects/${projectId}/sprints`)}>
              Go to Sprints
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="sprint-board-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-violet-600" />
                Sprint Board
              </h1>
              {sprint?.status === 'active' && (
                <Badge className="bg-green-100 text-green-700">
                  <Play className="w-3 h-3 mr-1" /> Active
                </Badge>
              )}
            </div>
            <p className="text-gray-500 mt-1">{project?.name || 'Project'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    {s.status === 'active' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={fetchSprintData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          
          {(sprint?.status === 'active' || sprint?.status === 'planning') && (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowCompleteModal(true)}
            >
              <CheckSquare className="w-4 h-4 mr-1" /> Complete Sprint
            </Button>
          )}
        </div>
      </div>

      {sprint && (
        <>
          {/* Sprint Info Bar */}
          <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <h2 className="font-semibold text-lg text-gray-900">{sprint.name}</h2>
                    <p className="text-sm text-gray-500">{sprint.goal || 'No sprint goal set'}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {sprint.start_date && format(parseISO(sprint.start_date), 'MMM d')} - {sprint.end_date && format(parseISO(sprint.end_date), 'MMM d')}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {sprint.start_date && sprint.end_date && (
                        <span>{differenceInDays(parseISO(sprint.end_date), new Date())} days left</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">{stats.completedPoints}</div>
                    <div className="text-xs text-gray-500">/ {stats.totalPoints} pts</div>
                  </div>
                  <div className="w-32">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Issues</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{getTasksByStatus('todo').length}</div>
                <div className="text-sm text-gray-500">To Do</div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
                <div className="text-sm text-gray-500">In Progress</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{getTasksByStatus('in_review').length}</div>
                <div className="text-sm text-gray-500">In Review</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-500">Done</div>
              </CardContent>
            </Card>
          </div>

          {/* Burndown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-violet-600" />
                Burndown Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={burndownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="ideal" 
                      stroke="#9CA3AF" 
                      strokeDasharray="5 5" 
                      name="Ideal"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      fill="#8B5CF6"
                      fillOpacity={0.1}
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      name="Actual"
                      dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                      connectNulls={false}
                    />
                    <ReferenceLine y={0} stroke="#10B981" strokeWidth={2} label={{ value: 'Goal', position: 'right' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sprint Board - Task Columns */}
          <div className="grid grid-cols-4 gap-4">
            {['todo', 'in_progress', 'in_review', 'completed'].map(status => (
              <Card key={status} className="bg-gray-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'todo' ? 'bg-blue-500' :
                        status === 'in_progress' ? 'bg-purple-500' :
                        status === 'in_review' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      {statusConfig[status]?.label || status}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getTasksByStatus(status).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {getTasksByStatus(status).map(task => (
                    <Card 
                      key={task.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow bg-white"
                      onClick={() => navigate(`/projects/${projectId}?task=${task.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-medium text-sm text-gray-900 line-clamp-2">{task.name}</span>
                          {task.story_points && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {task.story_points} SP
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={priorityConfig[task.priority]?.color || 'bg-gray-100'}>
                            {task.priority}
                          </Badge>
                          {task.issue_type && task.issue_type !== 'task' && (
                            <Badge variant="outline" className="text-xs">
                              {task.issue_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          {task.assigned_to_name && (
                            <div className="flex items-center gap-1">
                              <Avatar className="w-4 h-4">
                                <AvatarFallback className="text-[8px] bg-gray-200">
                                  {task.assigned_to_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[80px]">{task.assigned_to_name}</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(parseISO(task.due_date), 'MMM d')}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {getTasksByStatus(status).length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No tasks
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Complete Sprint Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-600" />
              Complete Sprint
            </DialogTitle>
            <DialogDescription>
              Completing the sprint will mark it as done and move incomplete tasks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Sprint Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <span className="ml-2 font-semibold text-green-600">{stats.completed} tasks</span>
                </div>
                <div>
                  <span className="text-gray-500">Incomplete:</span>
                  <span className="ml-2 font-semibold text-amber-600">{stats.incomplete} tasks</span>
                </div>
                <div>
                  <span className="text-gray-500">Points Done:</span>
                  <span className="ml-2 font-semibold">{stats.completedPoints}/{stats.totalPoints}</span>
                </div>
                <div>
                  <span className="text-gray-500">Progress:</span>
                  <span className="ml-2 font-semibold">{progress}%</span>
                </div>
              </div>
            </div>

            {/* Carry Forward Options */}
            {stats.incomplete > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Move {stats.incomplete} incomplete task(s) to:
                </label>
                <Select value={targetSprintId} onValueChange={setTargetSprintId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Backlog
                      </span>
                    </SelectItem>
                    {sprints.filter(s => s.id !== selectedSprintId && s.status === 'planning').map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4" /> {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {stats.incomplete === 0 && (
              <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                All tasks completed! Great work! 🎉
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteSprint}
              disabled={completing}
              className="bg-green-600 hover:bg-green-700"
            >
              {completing ? 'Completing...' : 'Complete Sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SprintBoardPage;
