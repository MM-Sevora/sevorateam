import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Map, ArrowLeft, ChevronLeft, ChevronRight, Target, Calendar,
  Layers, ZoomIn, ZoomOut, RefreshCw
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  eachWeekOfInterval, startOfWeek, endOfWeek, isSameMonth, isWithinInterval,
  parseISO, differenceInDays, addDays
} from 'date-fns';

const RoadmapPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState('month'); // 'week', 'month', 'quarter'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch projects
      const projectsRes = await api.get('/projects/list');
      const projectsList = projectsRes.data || [];
      setProjects(projectsList);
      
      // Fetch all epics
      const allEpics = [];
      for (const project of projectsList) {
        if (selectedProject && project.id !== selectedProject) continue;
        try {
          const epicsRes = await api.get(`/engineering/projects/${project.id}/epics`);
          if (epicsRes.data) {
            epicsRes.data.forEach(epic => {
              allEpics.push({ 
                ...epic, 
                project_id: project.id,
                project_name: project.name 
              });
            });
          }
        } catch (e) {}
      }
      setEpics(allEpics);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  }, [api, selectedProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate timeline headers
  const getTimelineHeaders = () => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 4));
    
    if (zoomLevel === 'week') {
      return eachWeekOfInterval({ start, end }).map(weekStart => ({
        date: weekStart,
        label: format(weekStart, 'MMM d'),
        isCurrentPeriod: isSameMonth(weekStart, new Date())
      }));
    } else if (zoomLevel === 'month') {
      const months = [];
      let current = start;
      while (current <= end) {
        months.push({
          date: current,
          label: format(current, 'MMM yyyy'),
          isCurrentPeriod: isSameMonth(current, new Date())
        });
        current = addMonths(current, 1);
      }
      return months;
    }
    return [];
  };

  const timelineHeaders = getTimelineHeaders();
  const timelineStart = timelineHeaders[0]?.date || new Date();
  const timelineEnd = timelineHeaders[timelineHeaders.length - 1]?.date || new Date();
  const totalDays = differenceInDays(timelineEnd, timelineStart) || 1;

  // Calculate position and width for an epic
  const getEpicPosition = (epic) => {
    if (!epic.start_date && !epic.end_date) {
      // No dates set - show as pending
      return { left: 0, width: 20, status: 'no-dates' };
    }
    
    const epicStart = epic.start_date ? parseISO(epic.start_date) : timelineStart;
    const epicEnd = epic.end_date ? parseISO(epic.end_date) : addDays(epicStart, 30);
    
    const startOffset = Math.max(0, differenceInDays(epicStart, timelineStart));
    const duration = differenceInDays(epicEnd, epicStart) + 1;
    
    const left = (startOffset / totalDays) * 100;
    const width = Math.max(5, (duration / totalDays) * 100);
    
    return { left: Math.min(95, left), width: Math.min(100 - left, width), status: 'scheduled' };
  };

  const statusColors = {
    todo: { bg: 'bg-gray-200', bar: 'bg-gray-400' },
    in_progress: { bg: 'bg-blue-100', bar: 'bg-blue-500' },
    completed: { bg: 'bg-green-100', bar: 'bg-green-500' }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading roadmap...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="roadmap-page">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Map className="w-6 h-6 text-violet-600" />
                Roadmap
              </h1>
              <p className="text-gray-500 mt-1">
                Timeline view of epics and milestones
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedProject || "all"} onValueChange={(v) => setSelectedProject(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Timeline Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium text-gray-700 min-w-[120px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Zoom:</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button 
                size="sm" 
                variant={zoomLevel === 'week' ? 'default' : 'ghost'}
                onClick={() => setZoomLevel('week')}
                className="h-7 px-3 text-xs"
              >
                Week
              </Button>
              <Button 
                size="sm" 
                variant={zoomLevel === 'month' ? 'default' : 'ghost'}
                onClick={() => setZoomLevel('month')}
                className="h-7 px-3 text-xs"
              >
                Month
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="min-w-[1200px]">
          {/* Timeline Header */}
          <div className="sticky top-0 z-10 flex border-b bg-white">
            <div className="w-[280px] shrink-0 p-3 border-r font-medium text-gray-700 bg-gray-50">
              Epic
            </div>
            <div className="flex-1 flex">
              {timelineHeaders.map((header, idx) => (
                <div 
                  key={idx}
                  className={`flex-1 p-2 text-center text-sm border-r ${
                    header.isCurrentPeriod ? 'bg-violet-50 font-medium text-violet-700' : 'text-gray-600'
                  }`}
                >
                  {header.label}
                </div>
              ))}
            </div>
          </div>

          {/* Epics */}
          {epics.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No epics found</h3>
              <p className="text-gray-500 mt-1">
                Create epics with start and end dates to see them on the roadmap
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {epics.map(epic => {
                const position = getEpicPosition(epic);
                const colors = statusColors[epic.status] || statusColors.todo;
                
                return (
                  <div 
                    key={epic.id}
                    className="flex hover:bg-gray-100/50 cursor-pointer"
                    onClick={() => navigate(`/projects/${epic.project_id}/epics`)}
                  >
                    {/* Epic Info */}
                    <div className="w-[280px] shrink-0 p-3 border-r">
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: epic.color || '#8B5CF6' }} 
                        />
                        <span className="font-medium text-gray-900 truncate">{epic.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">{epic.project_name}</span>
                        <Badge className={`text-[10px] ${
                          epic.status === 'completed' ? 'bg-green-100 text-green-700' :
                          epic.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {epic.status?.replace('_', ' ') || 'todo'}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <Progress value={epic.progress || 0} className="h-1" />
                      </div>
                    </div>
                    
                    {/* Timeline Bar */}
                    <div className="flex-1 relative py-3 px-2">
                      {position.status === 'no-dates' ? (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-xs text-gray-400 italic">No dates set</span>
                        </div>
                      ) : (
                        <div 
                          className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg ${colors.bg} border-l-4 ${colors.bar} flex items-center px-2 shadow-sm hover:shadow-md transition-shadow`}
                          style={{ 
                            left: `${position.left}%`, 
                            width: `${position.width}%`,
                            minWidth: '80px'
                          }}
                        >
                          <span className="text-xs font-medium text-gray-700 truncate">
                            {epic.name}
                          </span>
                          {epic.story_points > 0 && (
                            <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                              {epic.completed_points || 0}/{epic.story_points} pts
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t bg-white flex items-center gap-6 text-sm">
        <span className="text-gray-500">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 border-l-4 border-gray-400" />
          <span className="text-gray-600">To Do</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border-l-4 border-blue-500" />
          <span className="text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border-l-4 border-green-500" />
          <span className="text-gray-600">Completed</span>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage;
