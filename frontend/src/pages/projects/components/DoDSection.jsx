import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, AlertTriangle, ShieldCheck, Info, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { toast } from 'sonner';
import api from '../../../lib/api';

const DoDSection = ({ taskId, task, token, onUpdate }) => {
  const [dodStatus, setDodStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // Track which item is being updated

  const fetchDoDStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/tasks/${taskId}/dod`);
      setDodStatus(response.data);
    } catch (error) {
      // DoD might not be configured for this task type
      if (error.response?.status === 404) {
        setDodStatus(null);
      } else {
        console.error('Failed to fetch DoD status:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchDoDStatus();
    }
  }, [taskId]);

  const handleToggleItem = async (itemId, currentCompleted) => {
    setUpdating(itemId);
    try {
      await api.put(`/projects/tasks/${taskId}/dod/${itemId}?completed=${!currentCompleted}`);
      
      // Update local state optimistically
      setDodStatus(prev => {
        if (!prev) return prev;
        const updatedItems = prev.items.map(item => 
          item.id === itemId 
            ? { ...item, completed: !currentCompleted }
            : item
        );
        const completedRequired = updatedItems.filter(i => i.is_required && i.completed).length;
        const totalRequired = updatedItems.filter(i => i.is_required).length;
        return {
          ...prev,
          items: updatedItems,
          is_complete: updatedItems.every(i => !i.is_required || i.completed),
          completion_percentage: totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100
        };
      });
      
      toast.success(currentCompleted ? 'DoD item unchecked' : 'DoD item completed');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update DoD item:', error);
      toast.error('Failed to update DoD item');
    } finally {
      setUpdating(null);
    }
  };

  const handleInitialize = async () => {
    try {
      setLoading(true);
      await api.post(`/projects/tasks/${taskId}/dod/initialize`);
      await fetchDoDStatus();
      toast.success('DoD checklist initialized');
    } catch (error) {
      console.error('Failed to initialize DoD:', error);
      toast.error(error.response?.data?.detail || 'Failed to initialize DoD');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
        <span className="ml-2 text-gray-500">Loading DoD checklist...</span>
      </div>
    );
  }

  // No DoD items or not applicable for this task type
  if (!dodStatus || !dodStatus.items || dodStatus.items.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck className="w-10 h-10 text-gray-300" />
          <p className="text-gray-500 text-sm">
            Definition of Done is not configured for this task type.
          </p>
          {task?.project_id && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleInitialize}
              className="mt-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Initialize DoD Checklist
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { items, is_complete, completion_percentage, can_move_to_done } = dodStatus;
  const requiredItems = items.filter(i => i.is_required);
  const optionalItems = items.filter(i => !i.is_required);
  const completedRequired = requiredItems.filter(i => i.completed).length;

  return (
    <div className="space-y-4" data-testid="dod-section">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${is_complete ? 'text-green-600' : 'text-amber-500'}`} />
          <span className="font-medium text-gray-900">Definition of Done</span>
          {is_complete ? (
            <Badge className="bg-green-100 text-green-700 text-xs">Complete</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 text-xs">
              {completedRequired}/{requiredItems.length} Required
            </Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                All required items must be completed before this task can be moved to "Done".
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{Math.round(completion_percentage)}%</span>
        </div>
        <Progress 
          value={completion_percentage} 
          className={`h-2 ${is_complete ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {/* Required Items */}
        {requiredItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Required Items
            </p>
            {requiredItems.map(item => (
              <DoDItem 
                key={item.id} 
                item={item} 
                onToggle={handleToggleItem}
                isUpdating={updating === item.id}
              />
            ))}
          </div>
        )}

        {/* Optional Items */}
        {optionalItems.length > 0 && (
          <div className="space-y-1 mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Optional Items
            </p>
            {optionalItems.map(item => (
              <DoDItem 
                key={item.id} 
                item={item} 
                onToggle={handleToggleItem}
                isUpdating={updating === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Warning if incomplete */}
      {!is_complete && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Cannot move to Done</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Complete all required items before marking this task as done.
            </p>
          </div>
        </div>
      )}

      {/* Success message when complete */}
      {is_complete && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mt-4">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">Ready to be marked as Done</p>
            <p className="text-green-700 text-xs mt-0.5">
              All Definition of Done requirements have been met.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual DoD Item Component
const DoDItem = ({ item, onToggle, isUpdating }) => {
  const { id, label, description, is_required, completed, completed_by, completed_at } = item;

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
        completed 
          ? 'bg-green-50/50 border-green-200' 
          : is_required 
            ? 'bg-white border-gray-200 hover:border-gray-300' 
            : 'bg-gray-50/50 border-gray-100'
      }`}
      onClick={() => !isUpdating && onToggle(id, completed)}
      data-testid={`dod-item-${id}`}
    >
      <div className="pt-0.5">
        {isUpdating ? (
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
        ) : completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className={`w-5 h-5 ${is_required ? 'text-gray-400' : 'text-gray-300'}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${completed ? 'text-green-800 line-through' : 'text-gray-900'}`}>
            {label}
          </span>
          {is_required && !completed && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-red-200 text-red-600">
              Required
            </Badge>
          )}
        </div>
        {description && (
          <p className={`text-xs mt-0.5 ${completed ? 'text-green-600' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
        {completed && completed_at && (
          <p className="text-[10px] text-gray-400 mt-1">
            Completed {new Date(completed_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default DoDSection;
