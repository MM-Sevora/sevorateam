import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Flag, Clock, User, CheckCircle2,
  AlertTriangle, Calendar as CalendarIcon
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  high: { label: 'High', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  medium: { label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
  low: { label: 'Low', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-stone-400' },
  assigned: { label: 'Assigned', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500' },
  pending_review: { label: 'Review', color: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500' },
  approved: { label: 'Approved', color: 'bg-green-500' }
};

const TaskCalendarView = ({ tasks, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday
    
    // Build calendar grid
    const days = [];
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Next month padding (fill to 42 cells = 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = new Date(task.due_date).toDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate[selectedDate.toDateString()] || [];
  }, [selectedDate, tasksByDate]);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const formatMonth = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar Grid */}
      <div className="flex-1">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(-1)}
              className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-xl font-semibold text-[#4A3728] min-w-[180px] text-center">
              {formatMonth()}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(1)}
              className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
          >
            Today
          </Button>
        </div>

        {/* Week Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-[#6B5D52] py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((dayData, index) => {
            const dateKey = dayData.date.toDateString();
            const dayTasks = tasksByDate[dateKey] || [];
            const hasUrgent = dayTasks.some(t => t.priority === 'urgent');
            const hasHigh = dayTasks.some(t => t.priority === 'high');
            const hasOverdue = dayTasks.some(t => 
              !['completed', 'approved'].includes(t.status) && 
              new Date(t.due_date) < new Date()
            );

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(dayData.date)}
                className={`
                  min-h-[80px] p-2 rounded-lg cursor-pointer transition-all duration-200
                  ${dayData.isCurrentMonth ? 'bg-white' : 'bg-[#F5EBE0]/30'}
                  ${isToday(dayData.date) ? 'ring-2 ring-rose-500 ring-offset-1' : ''}
                  ${isSelected(dayData.date) ? 'bg-[#E8D5C4] shadow-md' : 'hover:bg-[#FDF8F3]'}
                  border border-[#E8D5C4]/50
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${dayData.isCurrentMonth ? 'text-[#4A3728]' : 'text-[#9C8C74]'}
                  ${isToday(dayData.date) ? 'text-rose-600' : ''}
                `}>
                  {dayData.day}
                </div>
                
                {/* Task indicators */}
                {dayTasks.length > 0 && (
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task, i) => (
                      <div
                        key={task.id}
                        className={`
                          text-xs px-1.5 py-0.5 rounded truncate
                          ${priorityConfig[task.priority]?.bgLight}
                          ${priorityConfig[task.priority]?.textColor}
                          ${task.status === 'completed' ? 'line-through opacity-60' : ''}
                        `}
                        title={task.name}
                      >
                        {task.name}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-[#6B5D52] text-center">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                )}
                
                {/* Priority/overdue indicators */}
                {dayTasks.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {hasOverdue && (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Overdue tasks" />
                    )}
                    {hasUrgent && !hasOverdue && (
                      <div className="w-2 h-2 rounded-full bg-red-400" title="Urgent tasks" />
                    )}
                    {hasHigh && !hasUrgent && !hasOverdue && (
                      <div className="w-2 h-2 rounded-full bg-orange-400" title="High priority" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task List Panel */}
      <div className="lg:w-80 bg-white rounded-lg border border-[#E8D5C4] p-4">
        <h4 className="font-semibold text-[#4A3728] mb-4 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-rose-600" />
          {selectedDate 
            ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            : 'Select a date'
          }
        </h4>
        
        {selectedDate ? (
          selectedDateTasks.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDateTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className={`
                    p-3 rounded-lg border-l-4 cursor-pointer
                    bg-[#FDF8F3] hover:bg-[#F5EBE0] transition-colors
                    ${task.priority === 'urgent' ? 'border-l-red-500' : ''}
                    ${task.priority === 'high' ? 'border-l-orange-500' : ''}
                    ${task.priority === 'medium' ? 'border-l-amber-500' : ''}
                    ${task.priority === 'low' ? 'border-l-emerald-500' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h5 className={`font-medium text-sm text-[#4A3728] ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                      {task.name}
                    </h5>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${statusConfig[task.status]?.color}`} />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B5D52]">
                    <Badge variant="outline" className={`${priorityConfig[task.priority]?.bgLight} ${priorityConfig[task.priority]?.textColor} border-0 text-xs`}>
                      <Flag className="w-3 h-3 mr-1" />
                      {task.priority}
                    </Badge>
                    
                    {task.assigned_to_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.assigned_to_name}
                      </span>
                    )}
                    
                    {task.estimated_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_hours}h
                      </span>
                    )}
                  </div>
                  
                  {task.is_blocked && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      Blocked
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#9C8C74]">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No tasks due this day</p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-[#9C8C74]">
            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Click on a date to see tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCalendarView;
