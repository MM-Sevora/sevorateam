import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Calendar, Target, TrendingUp, Clock, AlertTriangle, 
  Play, CheckCircle2, Edit3
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

/**
 * Sprint Selector Dropdown
 */
export const SprintSelector = ({
  sprints,
  selectedSprintId,
  onSelect,
  placeholder = "Select Sprint",
  className = "w-48"
}) => {
  return (
    <Select value={selectedSprintId || ''} onValueChange={onSelect}>
      <SelectTrigger className={className} data-testid="sprint-selector">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {sprints.map(sprint => (
          <SelectItem key={sprint.id} value={sprint.id}>
            <div className="flex items-center gap-2">
              {sprint.status === 'active' && <Play className="w-3 h-3 text-green-500" />}
              {sprint.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
              {sprint.status === 'planning' && <Edit3 className="w-3 h-3 text-blue-500" />}
              {sprint.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/**
 * Capacity Indicator with Progress Bar
 */
export const CapacityIndicator = ({
  plannedPoints,
  capacityPoints,
  teamHours,
  hoursPerPoint = 4,
  showTeamHours = true,
  compact = false
}) => {
  const capacityUsed = capacityPoints > 0 
    ? Math.min(100, Math.round((plannedPoints / capacityPoints) * 100)) 
    : 0;
  
  const getCapacityColor = () => {
    if (capacityUsed > 100) return 'text-red-600';
    if (capacityUsed > 80) return 'text-amber-600';
    return 'text-green-600';
  };
  
  const getProgressColor = () => {
    if (capacityUsed > 100) return '[&>div]:bg-red-500';
    if (capacityUsed > 80) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-green-500';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Progress value={capacityUsed} className={`h-2 w-24 ${getProgressColor()}`} />
        <span className={`text-sm font-medium ${getCapacityColor()}`}>
          {plannedPoints}/{capacityPoints} pts
        </span>
        {capacityUsed > 100 && <AlertTriangle className="w-4 h-4 text-red-500" />}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-gray-500">Capacity</p>
            <p className="text-lg font-semibold">{plannedPoints} / {capacityPoints} pts</p>
          </div>
          <TrendingUp className={`w-8 h-8 ${
            capacityUsed > 100 ? 'text-red-200' : 
            capacityUsed > 80 ? 'text-amber-200' : 'text-green-200'
          }`} />
        </div>
        <Progress value={capacityUsed} className={`h-2 ${getProgressColor()}`} />
        {capacityUsed > 100 && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Over capacity!
          </p>
        )}
        {capacityUsed > 80 && capacityUsed <= 100 && (
          <p className="text-xs text-amber-600 mt-1">Near capacity</p>
        )}
        {showTeamHours && teamHours > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Team: {teamHours}h ({Math.round(teamHours / hoursPerPoint)} pts @ {hoursPerPoint}h/pt)
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Sprint Info Cards - Shows sprint metrics
 */
export const SprintMetricsCards = ({
  sprint,
  sprintPoints,
  capacityPoints,
  teamHours,
  className = ""
}) => {
  if (!sprint) return null;
  
  const capacityUsed = capacityPoints > 0 
    ? Math.min(100, Math.round((sprintPoints / capacityPoints) * 100)) 
    : 0;

  return (
    <div className={`grid grid-cols-4 gap-4 ${className}`}>
      {/* Duration Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sprint Duration</p>
              <p className="text-sm font-semibold">
                {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-violet-200" />
          </div>
        </CardContent>
      </Card>
      
      {/* Planned Points Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Planned Points</p>
              <p className="text-2xl font-bold text-violet-600">{sprintPoints}</p>
            </div>
            <Target className="w-8 h-8 text-violet-200" />
          </div>
        </CardContent>
      </Card>
      
      {/* Capacity Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-500">Capacity</p>
              <p className="text-lg font-semibold">{sprintPoints} / {capacityPoints} pts</p>
            </div>
            <TrendingUp className={`w-8 h-8 ${
              capacityUsed > 100 ? 'text-red-200' : 
              capacityUsed > 80 ? 'text-amber-200' : 'text-green-200'
            }`} />
          </div>
          <Progress 
            value={capacityUsed} 
            className={`h-2 ${
              capacityUsed > 100 ? '[&>div]:bg-red-500' : 
              capacityUsed > 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'
            }`} 
          />
          {capacityUsed > 100 && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Over capacity!
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Team Hours Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Team Hours</p>
              <p className="text-2xl font-bold">{teamHours}h</p>
            </div>
            <Clock className="w-8 h-8 text-amber-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Sprint Goal Display
 */
export const SprintGoal = ({ goal, className = "" }) => {
  if (!goal) return null;
  
  return (
    <Card className={`border-violet-200 bg-violet-50/50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-violet-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-violet-900">Sprint Goal</p>
            <p className="text-sm text-violet-700">{goal}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Sprint Status Badge
 */
export const SprintStatusBadge = ({ status }) => {
  const config = {
    planning: { color: 'bg-blue-100 text-blue-700', icon: Edit3, label: 'Planning' },
    active: { color: 'bg-green-100 text-green-700', icon: Play, label: 'Active' },
    completed: { color: 'bg-purple-100 text-purple-700', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: 'bg-gray-100 text-gray-600', icon: null, label: 'Cancelled' }
  };
  
  const cfg = config[status] || config.planning;
  const Icon = cfg.icon;
  
  return (
    <Badge className={cfg.color}>
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {cfg.label}
    </Badge>
  );
};

export default SprintSelector;
