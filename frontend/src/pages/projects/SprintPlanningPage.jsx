import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Calendar, ChevronRight, Users, Target, Plus, Play, Pause, CheckCircle2,
  ArrowRight, GripVertical, Layers, Bug, BookOpen, CheckSquare, Zap,
  Clock, TrendingUp, AlertTriangle
} from 'lucide-react';

const SprintPlanningPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [backlogItems, setBacklogItems] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [sprintTasks, setSprintTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Capacity planning
  const [capacityModal, setCapacityModal] = useState(false);
  const [teamCapacity, setTeamCapacity] = useState({});
  
  // Selected items for drag
  const [selectedItems, setSelectedItems] = useState([]);

  const issueTypeIcons = {
    epic: <Layers className="w-4 h-4 text-purple-600" />,
    story: <BookOpen className="w-4 h-4 text-green-600" />,
    task: <CheckSquare className="w-4 h-4 text-blue-600" />,
    bug: <Bug className="w-4 h-4 text-red-600" />,
    subtask: <CheckSquare className="w-4 h-4 text-gray-500" />,
    improvement: <Zap className="w-4 h-4 text-amber-600" />
  };

  const fetchProject = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  }, [api, projectId]);

  const fetchSprints = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}/sprints`);
      const sprintList = response.data || [];
      setSprints(sprintList);
      
      // Select active sprint or first upcoming sprint
      const active = sprintList.find(s => s.status === 'active');
      const upcoming = sprintList.find(s => s.status === 'upcoming' || s.status === 'planned');
      setSelectedSprint(active || upcoming || sprintList[0] || null);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  }, [api, projectId]);

  const fetchBacklog = useCallback(async () => {
    try {
      const response = await api.get(`/engineering/projects/${projectId}/backlog`);
      setBacklogItems(response.data?.backlog_items || []);
    } catch (error) {
      console.error('Failed to fetch backlog:', error);
    }
  }, [api, projectId]);

  const fetchSprintTasks = useCallback(async () => {
    if (!selectedSprint) return;
    try {
      const response = await api.get(`/projects/tasks?sprint_id=${selectedSprint.id}`);
      setSprintTasks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sprint tasks:', error);
    }
  }, [api, selectedSprint]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setTeamMembers(response.data || []);
      
      // Initialize capacity for each member (default 40 hours/sprint)
      const capacity = {};
      response.data?.forEach(u => {
        capacity[u.id] = 40;
      });
      setTeamCapacity(capacity);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchSprints(), fetchBacklog(), fetchTeamMembers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProject, fetchSprints, fetchBacklog, fetchTeamMembers]);

  useEffect(() => {
    if (selectedSprint) {
      fetchSprintTasks();
    }
  }, [selectedSprint, fetchSprintTasks]);

  const handleMoveToSprint = async (taskId) => {
    if (!selectedSprint) {
      toast.error('Select a sprint first');
      return;
    }
    
    try {
      await api.post(`/engineering/tasks/${taskId}/move-to-sprint?sprint_id=${selectedSprint.id}`);
      toast.success('Added to sprint');
      fetchBacklog();
      fetchSprintTasks();
    } catch (error) {
      toast.error('Failed to add to sprint');
    }
  };

  const handleRemoveFromSprint = async (taskId) => {
    try {
      await api.post(`/engineering/tasks/${taskId}/move-to-sprint?sprint_id=`);
      toast.success('Moved to backlog');
      fetchBacklog();
      fetchSprintTasks();
    } catch (error) {
      toast.error('Failed to remove from sprint');
    }
  };

  const handleBulkMoveToSprint = async () => {
    if (!selectedSprint || selectedItems.length === 0) return;
    
    try {
      for (const taskId of selectedItems) {
        await api.post(`/engineering/tasks/${taskId}/move-to-sprint?sprint_id=${selectedSprint.id}`);
      }
      toast.success(`Added ${selectedItems.length} items to sprint`);
      setSelectedItems([]);
      fetchBacklog();
      fetchSprintTasks();
    } catch (error) {
      toast.error('Failed to add items');
    }
  };

  const handleStartSprint = async () => {
    if (!selectedSprint) return;
    
    try {
      await api.put(`/projects/${projectId}/sprints/${selectedSprint.id}`, { status: 'active' });
      toast.success('Sprint started!');
      fetchSprints();
    } catch (error) {
      toast.error('Failed to start sprint');
    }
  };

  // Calculate metrics
  const sprintPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const totalCapacity = Object.values(teamCapacity).reduce((sum, h) => sum + h, 0);
  const capacityInPoints = Math.round(totalCapacity / 4); // Assuming 4 hours per story point
  const capacityUsed = Math.min(100, Math.round((sprintPoints / capacityInPoints) * 100) || 0);
  const backlogPoints = backlogItems.reduce((sum, t) => sum + (t.story_points || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sprint planning...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="sprint-planning-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/projects/list')}>
              Projects
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/projects/${projectId}`)}>
              {project?.name}
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Sprint Planning</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Sprint Planning
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            value={selectedSprint?.id || ''} 
            onValueChange={(v) => setSelectedSprint(sprints.find(s => s.id === v))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    {s.status === 'active' && <Play className="w-3 h-3 text-green-500" />}
                    {s.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => setCapacityModal(true)}>
            <Users className="w-4 h-4 mr-2" /> Team Capacity
          </Button>
          
          {selectedSprint?.status === 'planned' && (
            <Button onClick={handleStartSprint} className="bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 mr-2" /> Start Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Info & Capacity */}
      {selectedSprint && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Sprint Duration</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedSprint.start_date).toLocaleDateString()} - {new Date(selectedSprint.end_date).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Planned Points</p>
                  <p className="text-2xl font-bold">{sprintPoints}</p>
                </div>
                <Target className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="text-lg font-semibold">{sprintPoints} / {capacityInPoints} pts</p>
                </div>
                <TrendingUp className={`w-8 h-8 ${capacityUsed > 100 ? 'text-red-200' : 'text-green-200'}`} />
              </div>
              <Progress 
                value={capacityUsed} 
                className={`h-2 ${capacityUsed > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`} 
              />
              {capacityUsed > 100 && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Over capacity!
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Team Hours</p>
                  <p className="text-2xl font-bold">{totalCapacity}h</p>
                </div>
                <Clock className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Planning Area */}
      <div className="grid grid-cols-2 gap-6">
        {/* Backlog */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Backlog ({backlogItems.length} items, {backlogPoints} pts)
            </CardTitle>
            {selectedItems.length > 0 && (
              <Button size="sm" onClick={handleBulkMoveToSprint}>
                <ArrowRight className="w-4 h-4 mr-1" /> Add {selectedItems.length} to Sprint
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto">
            {backlogItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Backlog is empty</p>
              </div>
            ) : (
              <div className="space-y-1">
                {backlogItems.map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 group"
                  >
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                    />
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    {issueTypeIcons[item.issue_type] || issueTypeIcons.task}
                    <span 
                      className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-blue-600"
                      onClick={() => navigate(`/projects/${projectId}?task=${item.id}`)}
                    >
                      {item.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.story_points || '-'} pts
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => handleMoveToSprint(item.id)}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sprint Scope */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              {selectedSprint?.name || 'Sprint'} ({sprintTasks.length} items, {sprintPoints} pts)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto">
            {!selectedSprint ? (
              <div className="py-8 text-center text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Select a sprint to start planning</p>
              </div>
            ) : sprintTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No items in sprint</p>
                <p className="text-xs mt-1">Add items from the backlog</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sprintTasks.map(task => (
                  <div 
                    key={task.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 group"
                  >
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    {issueTypeIcons[task.issue_type] || issueTypeIcons.task}
                    <span 
                      className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-blue-600"
                      onClick={() => navigate(`/projects/${projectId}?task=${task.id}`)}
                    >
                      {task.name}
                    </span>
                    {task.assigned_to_name && (
                      <Badge variant="outline" className="text-xs">
                        {task.assigned_to_name.split(' ')[0]}
                      </Badge>
                    )}
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      {task.story_points || '-'} pts
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveFromSprint(task.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Capacity Modal */}
      <Dialog open={capacityModal} onOpenChange={setCapacityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Team Capacity</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Set available hours per team member for this sprint
            </p>
            
            {teamMembers.slice(0, 10).map(member => (
              <div key={member.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                    {member.name?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={teamCapacity[member.id] || 0}
                    onChange={(e) => setTeamCapacity({
                      ...teamCapacity,
                      [member.id]: parseInt(e.target.value) || 0
                    })}
                    className="w-20 h-8 text-center"
                    min={0}
                    max={80}
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t flex items-center justify-between">
              <span className="font-medium">Total Capacity</span>
              <span className="text-lg font-bold">{totalCapacity} hours</span>
            </div>
            <p className="text-xs text-gray-500">
              ≈ {capacityInPoints} story points (assuming 4 hours/point)
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapacityModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SprintPlanningPage;
