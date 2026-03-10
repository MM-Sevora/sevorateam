import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { ClipboardList, Loader2 } from 'lucide-react';

/**
 * Reusable Create Task Dialog for creating operational tasks from any module
 * 
 * @param {boolean} open - Dialog open state
 * @param {function} onOpenChange - Dialog open state handler
 * @param {object} api - API instance from AuthContext
 * @param {string} sourceModule - Module name (sourcing, marketing, hr, sales)
 * @param {string} sourceEntityType - Entity type (brand, supplier, manufacturer, campaign, etc.)
 * @param {string} sourceEntityId - Entity ID
 * @param {string} sourceEntityName - Entity name for display
 * @param {function} onTaskCreated - Callback after task is created
 */
export default function CreateTaskDialog({
    open,
    onOpenChange,
    api,
    sourceModule,
    sourceEntityType,
    sourceEntityId,
    sourceEntityName,
    onTaskCreated
}) {
    const [loading, setLoading] = useState(false);
    const [taskData, setTaskData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assigned_to: '',
        assigned_team: sourceModule || ''
    });

    const handleCreate = async () => {
        if (!taskData.title.trim()) {
            toast.error('Task title is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: taskData.title,
                description: taskData.description,
                priority: taskData.priority,
                due_date: taskData.due_date || null,
                assigned_to: taskData.assigned_to || null,
                assigned_team: taskData.assigned_team || null,
                source_module: sourceModule,
                source_entity_type: sourceEntityType,
                source_entity_id: sourceEntityId,
                related_url: `/${sourceModule}/${sourceEntityType}s/${sourceEntityId}`,
                tags: [sourceModule, sourceEntityType]
            };

            await api.post('/tasks', payload);
            toast.success('Task created successfully');
            
            // Reset form
            setTaskData({
                title: '',
                description: '',
                priority: 'medium',
                due_date: '',
                assigned_to: '',
                assigned_team: sourceModule || ''
            });
            
            onOpenChange(false);
            if (onTaskCreated) {
                onTaskCreated();
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            toast.error('Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTaskData({
            title: '',
            description: '',
            priority: 'medium',
            due_date: '',
            assigned_to: '',
            assigned_team: sourceModule || ''
        });
        onOpenChange(false);
    };

    // Calculate default due date (3 days from now)
    const getDefaultDueDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 3);
        return date.toISOString().split('T')[0];
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-[#5C4033] flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Create Task
                    </DialogTitle>
                    <DialogDescription className="text-[#8B7355]">
                        Create a follow-up task for <strong>{sourceEntityName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Context Badge */}
                    <div className="flex items-center gap-2 p-3 bg-[#F5EBE0] rounded-lg">
                        <span className="text-xs font-medium text-[#8B7355] uppercase">{sourceModule}</span>
                        <span className="text-[#8B7355]">→</span>
                        <span className="text-sm font-medium text-[#5C4033]">{sourceEntityName}</span>
                    </div>

                    {/* Title */}
                    <div>
                        <Label className="text-[#5C4033]">Task Title *</Label>
                        <Input
                            value={taskData.title}
                            onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                            placeholder={`e.g., Follow up with ${sourceEntityName}`}
                            className="border-[#DDD0C8]"
                            data-testid="create-task-title"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label className="text-[#5C4033]">Description</Label>
                        <Textarea
                            value={taskData.description}
                            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                            placeholder="Add details about this task..."
                            className="border-[#DDD0C8]"
                            rows={2}
                        />
                    </div>

                    {/* Priority & Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[#5C4033]">Priority</Label>
                            <Select 
                                value={taskData.priority} 
                                onValueChange={(v) => setTaskData({ ...taskData, priority: v })}
                            >
                                <SelectTrigger className="border-[#DDD0C8]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-[#5C4033]">Due Date</Label>
                            <Input
                                type="date"
                                value={taskData.due_date || getDefaultDueDate()}
                                onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
                                className="border-[#DDD0C8]"
                            />
                        </div>
                    </div>

                    {/* Team Assignment */}
                    <div>
                        <Label className="text-[#5C4033]">Assign to Team</Label>
                        <Select 
                            value={taskData.assigned_team} 
                            onValueChange={(v) => setTaskData({ ...taskData, assigned_team: v })}
                        >
                            <SelectTrigger className="border-[#DDD0C8]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sourcing">Sourcing Team</SelectItem>
                                <SelectItem value="marketing">Marketing Team</SelectItem>
                                <SelectItem value="sales">Sales Team</SelectItem>
                                <SelectItem value="hr">HR Team</SelectItem>
                                <SelectItem value="operations">Operations Team</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={handleClose}
                        className="border-[#DDD0C8]"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCreate}
                        disabled={loading}
                        className="bg-[#8B7355] hover:bg-[#5C4033] text-white"
                        data-testid="submit-create-task"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
