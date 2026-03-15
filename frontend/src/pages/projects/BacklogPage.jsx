import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Layers, Target, ChevronRight, User, Calendar, GripVertical,
  Bug, BookOpen, CheckSquare, Zap, Search, Filter, ArrowRight,
  Plus, Clock
} from 'lucide-react';

const BacklogPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [backlog, setBacklog] = useState({ backlog_items: [], total_items: 0, total_story_points: 0 });
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  
  // Filters
  const [filterIssueType, setFilterIssueType] = useState('all');
  const [filterEpic, setFilterEpic] = useState('all');
  
  // Selection for bulk actions
  const [selectedItems, setSelectedItems] = useState([]);

  const issueTypeIcons = {
    epic: <Layers className="w-4 h-4 text-purple-600" />,
    story: <BookOpen className="w-4 h-4 text-green-600" />,
    task: <CheckSquare className="w-4 h-4 text-blue-600" />,
    bug: <Bug className="w-4 h-4 text-red-600" />,
    subtask: <CheckSquare className="w-4 h-4 text-gray-500" />,
    improvement: <Zap className="w-4 h-4 text-amber-600" />,
    spike: <Search className="w-4 h-4 text-indigo-600" />
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600'
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-600',
    todo: 'bg-blue-100 text-blue-600',
    not_started: 'bg-gray-100 text-gray-600',
    assigned: 'bg-indigo-100 text-indigo-600',
    in_progress: 'bg-amber-100 text-amber-600',
    pending_review: 'bg-purple-100 text-purple-600',
    approved: 'bg-green-100 text-green-600',
    completed: 'bg-green-100 text-green-600',
    on_hold: 'bg-gray-100 text-gray-600'
  };

  const fetchProject = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  }, [api, projectId]);

  const fetchBacklog = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterIssueType !== 'all') params.append('issue_type', filterIssueType);
      if (filterEpic !== 'all') params.append('epic_id', filterEpic);
      
      const response = await api.get(`/engineering/projects/${projectId}/backlog?${params}`);
      setBacklog(response.data);
    } catch (error) {
      toast.error('Failed to load backlog');
    } finally {
      setLoading(false);
    }
  }, [api, projectId, filterIssueType, filterEpic]);

  const fetchSprints = useCallback(async () => {
    try {
      const response = await api.get(`/projects/${projectId}/sprints`);
      setSprints(response.data?.filter(s => s.status !== 'completed') || []);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  }, [api, projectId]);

  const fetchEpics = useCallback(async () => {
    try {
      const response = await api.get(`/engineering/projects/${projectId}/epics`);
      setEpics(response.data || []);
    } catch (error) {
      console.error('Failed to fetch epics:', error);
    }
  }, [api, projectId]);

  useEffect(() => {
    fetchProject();
    fetchSprints();
    fetchEpics();
  }, [fetchProject, fetchSprints, fetchEpics]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  const handleMoveToSprint = async (taskId, sprintId) => {
    try {
      await api.post(`/engineering/tasks/${taskId}/move-to-sprint?sprint_id=${sprintId || ''}`);
      toast.success(sprintId ? 'Moved to sprint' : 'Moved to backlog');
      fetchBacklog();
    } catch (error) {
      toast.error('Failed to move task');
    }
  };

  const handleBulkMoveToSprint = async (sprintId) => {
    if (selectedItems.length === 0) {
      toast.info('Select items first');
      return;
    }
    
    try {
      for (const taskId of selectedItems) {
        await api.post(`/engineering/tasks/${taskId}/move-to-sprint?sprint_id=${sprintId}`);
      }
      toast.success(`Moved ${selectedItems.length} items to sprint`);
      setSelectedItems([]);
      fetchBacklog();
    } catch (error) {
      toast.error('Failed to move some items');
    }
  };

  const handleLinkToEpic = async (taskId, epicId) => {
    try {
      await api.post(`/engineering/tasks/${taskId}/link-epic?epic_id=${epicId || ''}`);
      toast.success(epicId ? 'Linked to epic' : 'Unlinked from epic');
      fetchBacklog();
    } catch (error) {
      toast.error('Failed to update epic link');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === backlog.backlog_items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(backlog.backlog_items.map(i => i.id));
    }
  };

  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="backlog-page">
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
            <span 
              className="hover:text-blue-600 cursor-pointer"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              {project?.name || 'Project'}
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Backlog</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Product Backlog
          </h1>
          <p className="text-gray-500 mt-1">
            Prioritize and plan your work
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}/epics`)}
          >
            <Layers className="w-4 h-4 mr-2" /> View Epics
          </Button>
          <Button 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Issue
          </Button>
        </div>
      </div>

      {/* Stats & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Total:</span>
            <Badge variant="outline">{backlog.total_items} items</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{backlog.total_story_points} story points</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filterIssueType} onValueChange={setFilterIssueType}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Issue Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
              <SelectItem value="spike">Spike</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterEpic} onValueChange={setFilterEpic}>
            <SelectTrigger className="w-44">
              <Layers className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Epic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Epics</SelectItem>
              {epics.map(epic => (
                <SelectItem key={epic.id} value={epic.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: epic.color }} />
                    {epic.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Select onValueChange={(sprintId) => handleBulkMoveToSprint(sprintId)}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Move to Sprint
                </SelectTrigger>
                <SelectContent>
                  {sprints.map(sprint => (
                    <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backlog Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading backlog...</div>
          ) : backlog.backlog_items.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Backlog is empty</h3>
              <p className="text-gray-500 mt-1">
                All items are either in sprints or completed
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left w-10">
                    <Checkbox 
                      checked={selectedItems.length === backlog.backlog_items.length && backlog.backlog_items.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left w-8"></th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Issue</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600 w-32">Epic</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-600 w-24">Priority</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-600 w-24">Status</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-600 w-20">Points</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600 w-36">Assignee</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-600 w-36">Sprint</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {backlog.backlog_items.map(item => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50 transition-colors"
                    data-testid={`backlog-item-${item.id}`}
                  >
                    <td className="p-3">
                      <Checkbox 
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleSelectItem(item.id)}
                      />
                    </td>
                    <td className="p-3">
                      <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {issueTypeIcons[item.issue_type] || issueTypeIcons.task}
                        <span 
                          className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                          onClick={() => navigate(`/projects/${projectId}?task=${item.id}`)}
                        >
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {item.epic_name ? (
                        <div className="flex items-center gap-1">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: item.epic_color || '#8B5CF6' }}
                          />
                          <span className="text-sm text-gray-600 truncate max-w-[100px]">
                            {item.epic_name}
                          </span>
                        </div>
                      ) : (
                        <Select onValueChange={(epicId) => handleLinkToEpic(item.id, epicId)}>
                          <SelectTrigger className="h-7 text-xs border-dashed">
                            <span className="text-gray-400">Link epic</span>
                          </SelectTrigger>
                          <SelectContent>
                            {epics.map(epic => (
                              <SelectItem key={epic.id} value={epic.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: epic.color }} />
                                  {epic.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={priorityColors[item.priority]}>
                        {item.priority}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={statusColors[item.status]}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-medium">
                        {item.story_points || '-'}
                      </span>
                    </td>
                    <td className="p-3">
                      {item.assigned_to_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                            {item.assigned_to_name.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-600 truncate max-w-[80px]">
                            {item.assigned_to_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Select 
                        value={item.sprint_id || 'backlog'} 
                        onValueChange={(sprintId) => handleMoveToSprint(item.id, sprintId === 'backlog' ? null : sprintId)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Add to sprint" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="backlog">Backlog</SelectItem>
                          {sprints.map(sprint => (
                            <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BacklogPage;
