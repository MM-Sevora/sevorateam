import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  Layers, BookOpen, CheckSquare, Bug, Zap, ListTodo,
  Plus, Link2, ChevronRight, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Work Hierarchy:
 * Epic → Story → Task → Subtask
 *              → Bug (can be linked to Story or Task)
 */

const issueTypeConfig = {
  epic: { 
    label: 'Epic', 
    icon: Layers, 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    canContain: ['story'],
    description: 'Large feature container'
  },
  story: { 
    label: 'Story', 
    icon: BookOpen, 
    color: 'bg-green-100 text-green-700 border-green-200',
    canContain: ['task', 'bug'],
    description: 'User story with acceptance criteria'
  },
  task: { 
    label: 'Task', 
    icon: CheckSquare, 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    canContain: ['subtask'],
    description: 'Development task'
  },
  subtask: { 
    label: 'Subtask', 
    icon: CheckSquare, 
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    canContain: [],
    description: 'Child task of a task'
  },
  bug: { 
    label: 'Bug', 
    icon: Bug, 
    color: 'bg-red-100 text-red-700 border-red-200',
    canContain: [],
    description: 'Bug or defect'
  }
};

const priorityOptions = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' }
];

/**
 * Hierarchical Task Creation Modal
 * Supports: Epic → Story → Task → Subtask → Bug hierarchy
 */
export const HierarchicalTaskModal = ({
  open,
  onClose,
  projectId,
  users: propUsers = [],
  epics = [],
  stories = [],
  tasks = [],
  onSuccess,
  // Pre-selected parent for creating children
  parentType = null,  // 'epic', 'story', 'task'
  parentId = null,
  parentName = null,
  // Pre-selected issue type
  defaultIssueType = null,
  // Edit mode
  editMode = false,
  editTask = null
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState(propUsers);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    issue_type: 'task',
    status: 'draft',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    story_points: '',
    epic_id: '',
    parent_story_id: '',
    parent_task_id: '',
    acceptance_criteria: ''
  });

  // Determine available issue types based on parent
  const getAvailableTypes = () => {
    if (parentType === 'epic') return ['story'];
    if (parentType === 'story') return ['task', 'bug'];
    if (parentType === 'task') return ['subtask'];
    return ['epic', 'story', 'task', 'bug'];
  };

  // Update local users when prop changes
  useEffect(() => {
    if (propUsers && propUsers.length > 0) {
      setUsers(propUsers);
    }
  }, [propUsers]);

  // Fetch users if not provided when modal opens
  useEffect(() => {
    const fetchUsers = async () => {
      if (open && users.length === 0) {
        try {
          const token = localStorage.getItem('sevora_token');
          const response = await fetch(`${API}/api/workos/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            const allUsers = data.users || data || [];
            const activeUsers = allUsers.filter(u => u.status === 'active');
            setUsers(activeUsers);
          }
        } catch (error) {
          console.error('Failed to fetch users:', error);
        }
      }
    };
    fetchUsers();
  }, [open, users.length]);

  // Initialize form based on props
  useEffect(() => {
    if (editMode && editTask) {
      setFormData({
        name: editTask.name || '',
        description: editTask.description || '',
        issue_type: editTask.issue_type || 'task',
        status: editTask.status || 'draft',
        priority: editTask.priority || 'medium',
        assigned_to: editTask.assigned_to || '',
        due_date: editTask.due_date || '',
        story_points: editTask.story_points?.toString() || '',
        epic_id: editTask.epic_id || '',
        parent_story_id: editTask.parent_story_id || '',
        parent_task_id: editTask.parent_task_id || '',
        acceptance_criteria: editTask.acceptance_criteria || ''
      });
    } else {
      // Reset form for creation
      const availableTypes = getAvailableTypes();
      const defaultType = defaultIssueType && availableTypes.includes(defaultIssueType) 
        ? defaultIssueType 
        : availableTypes[0];
      
      setFormData({
        name: '',
        description: '',
        issue_type: defaultType,
        status: 'draft',
        priority: 'medium',
        assigned_to: '',
        due_date: '',
        story_points: '',
        epic_id: parentType === 'epic' ? parentId : '',
        parent_story_id: parentType === 'story' ? parentId : '',
        parent_task_id: parentType === 'task' ? parentId : '',
        acceptance_criteria: ''
      });
    }
  }, [editMode, editTask, parentType, parentId, defaultIssueType, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const payload = {
        ...formData,
        project_id: projectId,
        story_points: formData.story_points ? parseInt(formData.story_points) : null
      };
      
      // Clean up empty fields
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.due_date) delete payload.due_date;
      if (!payload.epic_id) delete payload.epic_id;
      if (!payload.parent_story_id) delete payload.parent_story_id;
      if (!payload.parent_task_id) delete payload.parent_task_id;
      if (!payload.acceptance_criteria) delete payload.acceptance_criteria;

      const url = editMode 
        ? `${API}/api/projects/tasks/${editTask.id}`
        : `${API}/api/projects/tasks`;
      
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Failed to ${editMode ? 'update' : 'create'} item`);
      
      const typeLabel = issueTypeConfig[formData.issue_type]?.label || 'Item';
      toast.success(`${typeLabel} ${editMode ? 'updated' : 'created'}`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Failed to ${editMode ? 'update' : 'create'} item`);
    } finally {
      setLoading(false);
    }
  };

  const availableTypes = getAvailableTypes();
  const currentTypeConfig = issueTypeConfig[formData.issue_type];
  const TypeIcon = currentTypeConfig?.icon || CheckSquare;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-violet-600" />
            {editMode ? 'Edit' : 'Create'} {currentTypeConfig?.label || 'Item'}
          </DialogTitle>
          {parentName && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <span>Under:</span>
              <Badge variant="outline" className="text-xs">
                {issueTypeConfig[parentType]?.label}: {parentName}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Issue Type Selector */}
          <div>
            <Label className="mb-2 block">Issue Type *</Label>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map(type => {
                const cfg = issueTypeConfig[type];
                const Icon = cfg.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, issue_type: type })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border ${
                      formData.issue_type === type 
                        ? `${cfg.color} ring-2 ring-offset-1 ring-violet-500` 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                    }`}
                    data-testid={`issue-type-${type}`}
                  >
                    <Icon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">{currentTypeConfig?.description}</p>
          </div>

          {/* Name */}
          <div>
            <Label>{currentTypeConfig?.label} Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={
                formData.issue_type === 'story' 
                  ? 'As a user, I want to...' 
                  : formData.issue_type === 'bug'
                  ? 'Bug: [Component] - Brief description'
                  : `Enter ${currentTypeConfig?.label?.toLowerCase()} name`
              }
              className="mt-1"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Acceptance Criteria (for Stories) */}
          {formData.issue_type === 'story' && (
            <div>
              <Label>Acceptance Criteria</Label>
              <Textarea
                value={formData.acceptance_criteria}
                onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
                placeholder="- Given... When... Then...&#10;- Scenario 2..."
                rows={3}
                className="mt-1 font-mono text-sm"
              />
            </div>
          )}

          {/* Parent Relationships */}
          {!parentId && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Link2 className="w-4 h-4" /> Link to Parent
              </Label>
              
              {/* Epic selector (for stories) */}
              {formData.issue_type === 'story' && epics.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500">Parent Epic</Label>
                  <Select 
                    value={formData.epic_id || 'none'} 
                    onValueChange={(v) => setFormData({ ...formData, epic_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select epic (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Epic</SelectItem>
                      {epics.map(epic => (
                        <SelectItem key={epic.id} value={epic.id}>
                          <div className="flex items-center gap-2">
                            <Layers className="w-3 h-3 text-purple-600" />
                            {epic.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Story selector (for tasks/bugs) */}
              {['task', 'bug'].includes(formData.issue_type) && stories.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500">Parent Story</Label>
                  <Select 
                    value={formData.parent_story_id || 'none'} 
                    onValueChange={(v) => setFormData({ ...formData, parent_story_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select story (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Story</SelectItem>
                      {stories.map(story => (
                        <SelectItem key={story.id} value={story.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3 text-green-600" />
                            {story.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Task selector (for subtasks) */}
              {formData.issue_type === 'subtask' && tasks.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500">Parent Task *</Label>
                  <Select 
                    value={formData.parent_task_id || 'none'} 
                    onValueChange={(v) => setFormData({ ...formData, parent_task_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select parent task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a task</SelectItem>
                      {tasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-3 h-3 text-blue-600" />
                            {task.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Priority & Story Points Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Story Points</Label>
              <Input
                type="number"
                value={formData.story_points}
                onChange={(e) => setFormData({ ...formData, story_points: e.target.value })}
                placeholder="0"
                min={0}
                max={100}
                className="mt-1"
              />
            </div>
          </div>

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assignee</Label>
              <Select 
                value={formData.assigned_to || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, assigned_to: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editMode ? 'Update' : 'Create'} {currentTypeConfig?.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Quick Create Button with Hierarchy Menu
 */
export const HierarchyCreateButton = ({
  projectId,
  parentType,
  parentId,
  parentName,
  onSuccess,
  variant = 'default',
  size = 'sm'
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const availableTypes = parentType 
    ? issueTypeConfig[parentType]?.canContain || []
    : ['epic', 'story', 'task', 'bug'];

  if (availableTypes.length === 0) return null;

  // Single type - direct button
  if (availableTypes.length === 1) {
    const type = availableTypes[0];
    const cfg = issueTypeConfig[type];
    const Icon = cfg.icon;
    
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={() => {
            setSelectedType(type);
            setShowModal(true);
          }}
          className="gap-1"
        >
          <Plus className="w-3 h-3" />
          <Icon className="w-3 h-3" />
          Add {cfg.label}
        </Button>
        
        <HierarchicalTaskModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedType(null);
          }}
          projectId={projectId}
          parentType={parentType}
          parentId={parentId}
          parentName={parentName}
          defaultIssueType={selectedType}
          onSuccess={() => {
            setShowModal(false);
            setSelectedType(null);
            onSuccess?.();
          }}
        />
      </>
    );
  }

  // Multiple types - dropdown or buttons
  return (
    <>
      <div className="flex items-center gap-1">
        {availableTypes.map(type => {
          const cfg = issueTypeConfig[type];
          const Icon = cfg.icon;
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedType(type);
                setShowModal(true);
              }}
              className="gap-1 text-xs"
            >
              <Plus className="w-3 h-3" />
              <Icon className="w-3 h-3" />
              {cfg.label}
            </Button>
          );
        })}
      </div>
      
      <HierarchicalTaskModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedType(null);
        }}
        projectId={projectId}
        parentType={parentType}
        parentId={parentId}
        parentName={parentName}
        defaultIssueType={selectedType}
        onSuccess={() => {
          setShowModal(false);
          setSelectedType(null);
          onSuccess?.();
        }}
      />
    </>
  );
};

export default HierarchicalTaskModal;
