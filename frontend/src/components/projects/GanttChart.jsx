import React, { useState, useEffect, useMemo } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Calendar, ZoomIn, ZoomOut, Maximize2, 
  ChevronLeft, ChevronRight, Loader2 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const statusColors = {
  draft: '#9CA3AF',
  active: '#10B981',
  in_progress: '#3B82F6',
  on_hold: '#F59E0B',
  completed: '#6366F1',
  cancelled: '#EF4444',
  assigned: '#8B5CF6',
  pending_review: '#EC4899',
  approved: '#14B8A6'
};

const priorityColors = {
  urgent: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#6B7280'
};

const GanttChart = ({ projects = [], tasks = [], onTaskClick, onProjectClick, loading = false }) => {
  const [viewMode, setViewMode] = useState(ViewMode.Week);
  const [columnWidth, setColumnWidth] = useState(65);
  const [showTaskList, setShowTaskList] = useState(true);

  // Convert projects and tasks to Gantt format
  const ganttTasks = useMemo(() => {
    const items = [];
    
    // Add projects as parent items
    projects.forEach(project => {
      if (!project.start_date || !project.end_date) return;
      
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;
      if (endDate < startDate) return;
      
      items.push({
        id: project.id,
        name: project.name,
        start: startDate,
        end: endDate,
        progress: project.progress || 0,
        type: 'project',
        hideChildren: false,
        styles: {
          backgroundColor: statusColors[project.status] || '#8B7355',
          backgroundSelectedColor: statusColors[project.status] || '#6B5D52',
          progressColor: '#4A3728',
          progressSelectedColor: '#3A2A1E'
        },
        // Custom data
        _data: {
          status: project.status,
          priority: project.priority,
          project_id: project.project_id,
          isProject: true
        }
      });
      
      // Add tasks for this project
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      projectTasks.forEach(task => {
        if (!task.created_at && !task.due_date) return;
        
        const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.created_at || project.start_date);
        const taskEnd = task.due_date ? new Date(task.due_date) : new Date(taskStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        if (isNaN(taskStart.getTime()) || isNaN(taskEnd.getTime())) return;
        
        // Ensure end is after start
        const finalEnd = taskEnd > taskStart ? taskEnd : new Date(taskStart.getTime() + 24 * 60 * 60 * 1000);
        
        items.push({
          id: task.id,
          name: task.name || task.title,
          start: taskStart,
          end: finalEnd,
          progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
          type: 'task',
          project: project.id,
          styles: {
            backgroundColor: priorityColors[task.priority] || '#8B7355',
            backgroundSelectedColor: priorityColors[task.priority] || '#6B5D52',
            progressColor: statusColors[task.status] || '#4A3728',
            progressSelectedColor: '#3A2A1E'
          },
          _data: {
            status: task.status,
            priority: task.priority,
            task_id: task.task_id,
            assignee: task.assigned_to_name,
            isTask: true
          }
        });
      });
    });
    
    // Sort by start date
    items.sort((a, b) => a.start - b.start);
    
    return items;
  }, [projects, tasks]);

  const handleTaskClick = (task) => {
    if (task._data?.isProject && onProjectClick) {
      onProjectClick(task.id);
    } else if (task._data?.isTask && onTaskClick) {
      onTaskClick(task.id);
    }
  };

  const handleZoomIn = () => {
    const modes = [ViewMode.Hour, ViewMode.QuarterDay, ViewMode.HalfDay, ViewMode.Day, ViewMode.Week, ViewMode.Month, ViewMode.Year];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex > 0) {
      setViewMode(modes[currentIndex - 1]);
      setColumnWidth(Math.min(columnWidth + 10, 150));
    }
  };

  const handleZoomOut = () => {
    const modes = [ViewMode.Hour, ViewMode.QuarterDay, ViewMode.HalfDay, ViewMode.Day, ViewMode.Week, ViewMode.Month, ViewMode.Year];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex < modes.length - 1) {
      setViewMode(modes[currentIndex + 1]);
      setColumnWidth(Math.max(columnWidth - 10, 40));
    }
  };

  // Custom task list header
  const TaskListHeader = ({ headerHeight }) => (
    <div 
      className="bg-[#F5EBE0] border-b border-[#E8D5C4] flex items-center px-4 font-semibold text-[#4A3728]"
      style={{ height: headerHeight }}
    >
      <span className="flex-1">Name</span>
      <span className="w-24 text-center">Status</span>
      <span className="w-20 text-center">Progress</span>
    </div>
  );

  // Custom task list item
  const TaskListTable = ({ rowHeight, tasks: ganttItems, selectedTaskId, onExpanderClick }) => (
    <div className="bg-white">
      {ganttItems.map((item, index) => (
        <div 
          key={item.id}
          className={`flex items-center px-4 border-b border-[#E8D5C4] cursor-pointer transition-colors
            ${selectedTaskId === item.id ? 'bg-[#F5EBE0]' : 'hover:bg-[#F5EBE0]/50'}`}
          style={{ height: rowHeight }}
          onClick={() => handleTaskClick(item)}
        >
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {item.type === 'project' && (
              <div 
                className="w-4 h-4 flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpanderClick(item);
                }}
              >
                {item.hideChildren ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3 rotate-90" />}
              </div>
            )}
            {item.type === 'task' && <div className="w-4" />}
            <span className={`truncate ${item.type === 'project' ? 'font-semibold text-[#4A3728]' : 'text-[#5D4A3A] pl-2'}`}>
              {item._data?.project_id && <span className="text-xs text-[#8B7355] mr-2">{item._data.project_id}</span>}
              {item._data?.task_id && <span className="text-xs text-[#8B7355] mr-2">{item._data.task_id}</span>}
              {item.name}
            </span>
          </div>
          <div className="w-24 flex justify-center">
            <Badge 
              variant="outline" 
              className="text-xs capitalize"
              style={{ 
                backgroundColor: `${statusColors[item._data?.status]}20`,
                borderColor: statusColors[item._data?.status],
                color: statusColors[item._data?.status]
              }}
            >
              {item._data?.status?.replace('_', ' ')}
            </Badge>
          </div>
          <div className="w-20 text-center text-sm text-[#5D4A3A]">
            {Math.round(item.progress)}%
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="py-20 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-[#8B7355] animate-spin mb-4" />
          <p className="text-[#5D4A3A]">Loading Gantt chart...</p>
        </CardContent>
      </Card>
    );
  }

  if (ganttTasks.length === 0) {
    return (
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="py-16 text-center">
          <Calendar className="w-12 h-12 mx-auto text-[#D4BBA6] mb-4" />
          <h3 className="font-semibold text-[#4A3728] mb-2">No Timeline Data</h3>
          <p className="text-[#5D4A3A] text-sm">
            Add start and end dates to your projects to see them on the Gantt chart.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-[#E8D5C4] overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-[#E8D5C4] bg-[#F5EBE0]/50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#8B7355]" />
          <span className="font-semibold text-[#4A3728]">Timeline View</span>
          <Badge variant="outline" className="bg-white text-[#5D4A3A]">
            {ganttTasks.length} items
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <Select value={viewMode} onValueChange={(v) => setViewMode(v)}>
            <SelectTrigger className="w-32 h-9 bg-white border-[#D4BBA6]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ViewMode.Day}>Day</SelectItem>
              <SelectItem value={ViewMode.Week}>Week</SelectItem>
              <SelectItem value={ViewMode.Month}>Month</SelectItem>
              <SelectItem value={ViewMode.Year}>Year</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Zoom Controls */}
          <div className="flex items-center border border-[#D4BBA6] rounded-lg bg-white">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2 hover:bg-[#F5EBE0]"
              onClick={handleZoomIn}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-[#D4BBA6]" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2 hover:bg-[#F5EBE0]"
              onClick={handleZoomOut}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Toggle Task List */}
          <Button
            variant="outline"
            size="sm"
            className={`h-9 border-[#D4BBA6] ${showTaskList ? 'bg-[#4A3728] text-white hover:bg-[#3A2A1E]' : ''}`}
            onClick={() => setShowTaskList(!showTaskList)}
          >
            <Maximize2 className="w-4 h-4 mr-1" />
            List
          </Button>
        </div>
      </div>
      
      {/* Gantt Chart */}
      <div className="gantt-container" style={{ maxHeight: '600px', overflow: 'auto' }}>
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          columnWidth={columnWidth}
          listCellWidth={showTaskList ? "300px" : ""}
          rowHeight={45}
          headerHeight={50}
          barCornerRadius={4}
          barFill={75}
          handleWidth={8}
          todayColor="rgba(74, 55, 40, 0.1)"
          onClick={handleTaskClick}
          TooltipContent={({ task }) => (
            <div className="bg-[#4A3728] text-white p-3 rounded-lg shadow-lg text-sm">
              <div className="font-semibold mb-1">{task.name}</div>
              <div className="text-[#D4BBA6] text-xs space-y-1">
                <div>Start: {task.start.toLocaleDateString()}</div>
                <div>End: {task.end.toLocaleDateString()}</div>
                <div>Progress: {Math.round(task.progress)}%</div>
                {task._data?.assignee && <div>Assignee: {task._data.assignee}</div>}
              </div>
            </div>
          )}
          TaskListHeader={showTaskList ? TaskListHeader : () => null}
          TaskListTable={showTaskList ? TaskListTable : () => null}
        />
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 border-t border-[#E8D5C4] bg-[#F5EBE0]/30 flex items-center gap-6 flex-wrap text-xs">
        <span className="text-[#5D4A3A] font-medium">Status:</span>
        {Object.entries(statusColors).slice(0, 5).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-[#5D4A3A] capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GanttChart;
