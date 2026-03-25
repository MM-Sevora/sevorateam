import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { 
  BarChart3, Calendar, BookOpen, CheckSquare, Bug, 
  AlertCircle, AlertTriangle, Play
} from 'lucide-react';

/**
 * Review Modal before starting a sprint
 */
export const SprintReviewModal = ({
  open,
  onClose,
  sprint,
  tasks,
  capacityPoints,
  onStartSprint,
  isStarting = false
}) => {
  if (!sprint) return null;
  
  const storyCount = tasks.filter(t => t.issue_type === 'story').length;
  const taskCount = tasks.filter(t => t.issue_type === 'task' || !t.issue_type).length;
  const bugCount = tasks.filter(t => t.issue_type === 'bug').length;
  const unassignedCount = tasks.filter(t => !t.assigned_to).length;
  const noEstimateCount = tasks.filter(t => !t.story_points).length;
  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const totalItems = tasks.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-600" />
            Review & Start Sprint
          </DialogTitle>
          <DialogDescription>Review sprint details before starting</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Sprint Info */}
          <div className="p-4 bg-violet-50 rounded-lg">
            <h3 className="font-semibold text-violet-900">{sprint.name}</h3>
            {sprint.goal && (
              <p className="text-sm text-violet-700 mt-1">{sprint.goal}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-violet-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                <p className="text-xs text-gray-500">Total Items</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-violet-600">{totalPoints}</p>
                <p className="text-xs text-gray-500">Story Points</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{capacityPoints}</p>
                <p className="text-xs text-gray-500">Team Capacity</p>
              </CardContent>
            </Card>
          </div>

          {/* Item Breakdown */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4 text-green-600" />
              {storyCount} Stories
            </span>
            <span className="flex items-center gap-1">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              {taskCount} Tasks
            </span>
            <span className="flex items-center gap-1">
              <Bug className="w-4 h-4 text-red-600" />
              {bugCount} Bugs
            </span>
          </div>

          {/* Warnings */}
          {(unassignedCount > 0 || noEstimateCount > 0 || totalPoints > capacityPoints) && (
            <div className="space-y-2">
              {unassignedCount > 0 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {unassignedCount} item(s) are unassigned
                </div>
              )}
              {noEstimateCount > 0 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {noEstimateCount} item(s) have no estimate
                </div>
              )}
              {totalPoints > capacityPoints && capacityPoints > 0 && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                  <AlertTriangle className="w-4 h-4" />
                  Sprint is over capacity ({totalPoints} pts vs {capacityPoints} pts available)
                </div>
              )}
            </div>
          )}

          {totalItems === 0 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded">
              <AlertCircle className="w-4 h-4" />
              No items in sprint. Add items from backlog before starting.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={onStartSprint} 
            className="bg-green-600 hover:bg-green-700"
            disabled={totalItems === 0 || isStarting}
            data-testid="confirm-start-sprint-btn"
          >
            <Play className="w-4 h-4 mr-2" />
            {isStarting ? 'Starting...' : 'Start Sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Team Capacity Modal
 */
export const TeamCapacityModal = ({
  open,
  onClose,
  teamMembers,
  teamCapacity,
  onCapacityChange,
  hoursPerPoint = 4
}) => {
  const totalCapacity = Object.values(teamCapacity).reduce((sum, h) => sum + (h || 0), 0);
  const capacityInPoints = Math.round(totalCapacity / hoursPerPoint);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Team Capacity</DialogTitle>
          <DialogDescription>Set available hours per team member for this sprint</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {teamMembers.slice(0, 15).map(member => (
            <div key={member.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm font-medium text-violet-600">
                  {member.name?.charAt(0)}
                </div>
                <span className="text-sm font-medium">{member.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={teamCapacity[member.id] || 0}
                  onChange={(e) => onCapacityChange(member.id, parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center border rounded"
                  min={0}
                  max={80}
                />
                <span className="text-sm text-gray-500">hrs</span>
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t flex items-center justify-between">
            <span className="font-medium">Total Capacity</span>
            <span className="text-lg font-bold">{totalCapacity} hours</span>
          </div>
          <p className="text-xs text-gray-500">
            ≈ {capacityInPoints} story points (assuming {hoursPerPoint} hours/point)
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Create Sprint Modal
 */
export const CreateSprintModal = ({
  open,
  onClose,
  formData,
  onFormChange,
  onSubmit,
  isSaving = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Sprint</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Sprint Name *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              placeholder="e.g., Sprint 1"
              className="w-full mt-1 px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Sprint Goal</label>
            <textarea
              value={formData.goal || ''}
              onChange={(e) => onFormChange({ ...formData, goal: e.target.value })}
              placeholder="What do you want to achieve in this sprint?"
              className="w-full mt-1 px-3 py-2 border rounded-md"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date *</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => onFormChange({ ...formData, start_date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date *</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => onFormChange({ ...formData, end_date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700">
            {isSaving ? 'Creating...' : 'Create Sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SprintReviewModal;
