import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
    Bot, Plus, Settings, Zap, Clock, Edit, Trash2,
    Loader2, AlertTriangle, CheckCircle, Package, Target, Users
} from 'lucide-react';

const moduleOptions = [
    { value: 'sourcing', label: 'Sourcing', icon: Package },
    { value: 'marketing', label: 'Marketing', icon: Target },
    { value: 'hr', label: 'HR', icon: Users },
    { value: 'sales', label: 'Sales', icon: Target }
];

const entityOptions = {
    sourcing: ['brand', 'supplier', 'manufacturer'],
    marketing: ['campaign', 'influencer', 'publication'],
    hr: ['employee', 'leave_request'],
    sales: ['lead', 'customer', 'deal']
};

const eventOptions = [
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'status_changed', label: 'Status Changed' },
    { value: 'assigned', label: 'Assigned' }
];

const priorityOptions = [
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' }
];

export default function TaskTriggersPage() {
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);

    const [formData, setFormData] = useState({
        module: '',
        entity_type: '',
        trigger_event: 'created',
        trigger_condition: null,
        enabled: true,
        due_date_offset_days: 3,
        task_template: {
            title: '',
            description: '',
            priority: 'medium',
            assigned_team: '',
            trigger_type: '',
            tags: []
        }
    });

    useEffect(() => {
        fetchTriggers();
    }, []);

    const fetchTriggers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tasks/triggers/config');
            setTriggers(response.data || []);
        } catch (error) {
            console.error('Failed to fetch triggers:', error);
            toast.error('Failed to load triggers');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        if (!formData.module || !formData.entity_type || !formData.task_template.title) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setSaveLoading(true);
            
            const payload = {
                ...formData,
                task_template: {
                    ...formData.task_template,
                    trigger_type: formData.task_template.trigger_type || formData.trigger_event
                }
            };

            if (editingTrigger) {
                await api.put(`/tasks/triggers/config/${editingTrigger.id}`, payload);
                toast.success('Trigger updated successfully');
            } else {
                await api.post('/tasks/triggers/config', payload);
                toast.success('Trigger created successfully');
            }

            setShowCreateDialog(false);
            setEditingTrigger(null);
            resetForm();
            fetchTriggers();
        } catch (error) {
            console.error('Failed to save trigger:', error);
            toast.error('Failed to save trigger');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (triggerId) => {
        if (!window.confirm('Are you sure you want to delete this trigger?')) return;

        try {
            await api.delete(`/tasks/triggers/config/${triggerId}`);
            toast.success('Trigger deleted');
            fetchTriggers();
        } catch (error) {
            console.error('Failed to delete trigger:', error);
            toast.error('Failed to delete trigger');
        }
    };

    const handleToggleEnabled = async (trigger) => {
        try {
            await api.put(`/tasks/triggers/config/${trigger.id}`, {
                ...trigger,
                enabled: !trigger.enabled
            });
            toast.success(trigger.enabled ? 'Trigger disabled' : 'Trigger enabled');
            fetchTriggers();
        } catch (error) {
            console.error('Failed to toggle trigger:', error);
            toast.error('Failed to update trigger');
        }
    };

    const handleEdit = (trigger) => {
        setEditingTrigger(trigger);
        setFormData({
            module: trigger.module,
            entity_type: trigger.entity_type,
            trigger_event: trigger.trigger_event,
            trigger_condition: trigger.trigger_condition,
            enabled: trigger.enabled,
            due_date_offset_days: trigger.due_date_offset_days || 3,
            task_template: trigger.task_template || {
                title: '',
                description: '',
                priority: 'medium',
                assigned_team: '',
                trigger_type: '',
                tags: []
            }
        });
        setShowCreateDialog(true);
    };

    const resetForm = () => {
        setFormData({
            module: '',
            entity_type: '',
            trigger_event: 'created',
            trigger_condition: null,
            enabled: true,
            due_date_offset_days: 3,
            task_template: {
                title: '',
                description: '',
                priority: 'medium',
                assigned_team: '',
                trigger_type: '',
                tags: []
            }
        });
    };

    const openCreateDialog = () => {
        resetForm();
        setEditingTrigger(null);
        setShowCreateDialog(true);
    };

    const getModuleIcon = (module) => {
        const opt = moduleOptions.find(m => m.value === module);
        return opt ? opt.icon : Package;
    };

    return (
        <div className="min-h-screen bg-[#F5EBE0] p-6" data-testid="task-triggers-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#5C4033]">Smart Task Triggers</h1>
                    <p className="text-[#8B7355]">
                        Configure automatic task creation based on module events
                    </p>
                </div>
                <Button 
                    onClick={openCreateDialog}
                    className="bg-[#8B7355] hover:bg-[#5C4033] text-white"
                    data-testid="create-trigger-btn"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Trigger
                </Button>
            </div>

            {/* Info Card */}
            <Card className="bg-purple-50 border-purple-200 mb-6">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Bot className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-purple-800">How Smart Triggers Work</h3>
                            <p className="text-sm text-purple-700 mt-1">
                                Smart triggers automatically create tasks when specific events occur in your modules. 
                                For example, when a new brand is added in Sourcing, a task can be created to initiate outreach.
                                The system uses deduplication to prevent duplicate tasks from being created.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Triggers Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
                </div>
            ) : triggers.length === 0 ? (
                <Card className="bg-white/80 border-[#DDD0C8]">
                    <CardContent className="py-12 text-center">
                        <Bot className="w-12 h-12 text-[#DDD0C8] mx-auto mb-4" />
                        <p className="text-[#8B7355]">No triggers configured yet</p>
                        <p className="text-sm text-[#8B7355] mt-1">
                            Create your first trigger to automate task creation
                        </p>
                        <Button 
                            onClick={openCreateDialog}
                            variant="outline"
                            className="mt-4 border-[#8B7355] text-[#8B7355]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Trigger
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {triggers.map((trigger) => {
                        const ModuleIcon = getModuleIcon(trigger.module);
                        const priorityOpt = priorityOptions.find(p => p.value === trigger.task_template?.priority);

                        return (
                            <Card 
                                key={trigger.id}
                                className={`bg-white/80 border-[#DDD0C8] ${!trigger.enabled ? 'opacity-60' : ''}`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-[#F5EBE0] rounded-lg">
                                                <ModuleIcon className="w-4 h-4 text-[#8B7355]" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm text-[#5C4033]">
                                                    {trigger.module} / {trigger.entity_type}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    On: {trigger.trigger_event}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={trigger.enabled}
                                            onCheckedChange={() => handleToggleEnabled(trigger)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="font-medium text-[#5C4033] text-sm">
                                                {trigger.task_template?.title || 'Untitled Task'}
                                            </p>
                                            {trigger.task_template?.description && (
                                                <p className="text-xs text-[#8B7355] mt-1 line-clamp-2">
                                                    {trigger.task_template.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {priorityOpt && (
                                                <Badge className={`${priorityOpt.color} text-xs`}>
                                                    {priorityOpt.label}
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs border-[#DDD0C8]">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Due in {trigger.due_date_offset_days}d
                                            </Badge>
                                            {trigger.task_template?.assigned_team && (
                                                <Badge variant="outline" className="text-xs border-[#DDD0C8]">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {trigger.task_template.assigned_team}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t border-[#DDD0C8]">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(trigger)}
                                                className="flex-1 text-[#8B7355]"
                                            >
                                                <Edit className="w-4 h-4 mr-1" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(trigger.id)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-[#5C4033]">
                            {editingTrigger ? 'Edit Trigger' : 'Create Smart Trigger'}
                        </DialogTitle>
                        <DialogDescription className="text-[#8B7355]">
                            Configure when and how tasks should be automatically created
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Trigger Source */}
                        <div className="space-y-3 p-4 bg-[#F5EBE0]/50 rounded-lg">
                            <h4 className="font-medium text-[#5C4033] text-sm">Trigger Source</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[#5C4033] text-xs">Module *</Label>
                                    <Select 
                                        value={formData.module} 
                                        onValueChange={(v) => setFormData({ 
                                            ...formData, 
                                            module: v, 
                                            entity_type: '' 
                                        })}
                                    >
                                        <SelectTrigger className="border-[#DDD0C8] bg-white">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {moduleOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[#5C4033] text-xs">Entity Type *</Label>
                                    <Select 
                                        value={formData.entity_type} 
                                        onValueChange={(v) => setFormData({ ...formData, entity_type: v })}
                                        disabled={!formData.module}
                                    >
                                        <SelectTrigger className="border-[#DDD0C8] bg-white">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(entityOptions[formData.module] || []).map(entity => (
                                                <SelectItem key={entity} value={entity}>
                                                    {entity.charAt(0).toUpperCase() + entity.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label className="text-[#5C4033] text-xs">Trigger Event *</Label>
                                <Select 
                                    value={formData.trigger_event} 
                                    onValueChange={(v) => setFormData({ ...formData, trigger_event: v })}
                                >
                                    <SelectTrigger className="border-[#DDD0C8] bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eventOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Task Template */}
                        <div className="space-y-3 p-4 bg-[#F5EBE0]/50 rounded-lg">
                            <h4 className="font-medium text-[#5C4033] text-sm">Task Template</h4>
                            <div>
                                <Label className="text-[#5C4033] text-xs">
                                    Task Title * <span className="text-[#8B7355]">(use {'{entity_name}'} as placeholder)</span>
                                </Label>
                                <Input
                                    value={formData.task_template.title}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        task_template: { ...formData.task_template, title: e.target.value }
                                    })}
                                    placeholder="e.g., Initial outreach to {entity_name}"
                                    className="border-[#DDD0C8] bg-white"
                                />
                            </div>
                            <div>
                                <Label className="text-[#5C4033] text-xs">Description</Label>
                                <Textarea
                                    value={formData.task_template.description}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        task_template: { ...formData.task_template, description: e.target.value }
                                    })}
                                    placeholder="Task description..."
                                    className="border-[#DDD0C8] bg-white"
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[#5C4033] text-xs">Priority</Label>
                                    <Select 
                                        value={formData.task_template.priority} 
                                        onValueChange={(v) => setFormData({
                                            ...formData,
                                            task_template: { ...formData.task_template, priority: v }
                                        })}
                                    >
                                        <SelectTrigger className="border-[#DDD0C8] bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorityOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[#5C4033] text-xs">Due In (days)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={formData.due_date_offset_days}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            due_date_offset_days: parseInt(e.target.value) || 3
                                        })}
                                        className="border-[#DDD0C8] bg-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-[#5C4033] text-xs">Assign to Team</Label>
                                <Select 
                                    value={formData.task_template.assigned_team || 'none'} 
                                    onValueChange={(v) => setFormData({
                                        ...formData,
                                        task_template: { ...formData.task_template, assigned_team: v === 'none' ? '' : v }
                                    })}
                                >
                                    <SelectTrigger className="border-[#DDD0C8] bg-white">
                                        <SelectValue placeholder="Select team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="sourcing">Sourcing Team</SelectItem>
                                        <SelectItem value="marketing">Marketing Team</SelectItem>
                                        <SelectItem value="sales">Sales Team</SelectItem>
                                        <SelectItem value="hr">HR Team</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Enable Switch */}
                        <div className="flex items-center justify-between p-4 bg-[#F5EBE0]/50 rounded-lg">
                            <div>
                                <p className="font-medium text-[#5C4033] text-sm">Enabled</p>
                                <p className="text-xs text-[#8B7355]">
                                    Trigger will create tasks automatically when enabled
                                </p>
                            </div>
                            <Switch
                                checked={formData.enabled}
                                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowCreateDialog(false);
                                setEditingTrigger(null);
                                resetForm();
                            }}
                            className="border-[#DDD0C8]"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreateOrUpdate}
                            disabled={saveLoading}
                            className="bg-[#8B7355] hover:bg-[#5C4033] text-white"
                        >
                            {saveLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingTrigger ? 'Update Trigger' : 'Create Trigger'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
