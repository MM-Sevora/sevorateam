import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  RefreshCw, Plus, Edit2, Trash2, ArrowRight, CheckCircle2,
  Clock, AlertCircle, ChevronRight
} from 'lucide-react';

const WorkflowsPage = () => {
  const { api } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    issue_type: 'task',
    statuses: []
  });
  const [newStatus, setNewStatus] = useState({ name: '', category: 'todo' });

  const issueTypes = [
    { value: 'task', label: 'Task' },
    { value: 'bug', label: 'Bug' },
    { value: 'story', label: 'Story' },
    { value: 'epic', label: 'Epic' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'spike', label: 'Spike' },
  ];

  const statusCategories = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-700' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
  ];

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/workflows');
      setWorkflows(response.data || []);
    } catch (error) {
      // If no workflows endpoint yet, show default
      setWorkflows([
        {
          id: 'default-task',
          name: 'Default Task Workflow',
          issue_type: 'task',
          statuses: [
            { name: 'To Do', category: 'todo' },
            { name: 'In Progress', category: 'in_progress' },
            { name: 'Review', category: 'in_progress' },
            { name: 'Done', category: 'done' },
          ]
        },
        {
          id: 'default-bug',
          name: 'Bug Workflow',
          issue_type: 'bug',
          statuses: [
            { name: 'New', category: 'todo' },
            { name: 'Triaged', category: 'todo' },
            { name: 'In Progress', category: 'in_progress' },
            { name: 'Fixed', category: 'in_progress' },
            { name: 'Verified', category: 'done' },
            { name: 'Closed', category: 'done' },
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleOpenModal = (workflow = null) => {
    if (workflow) {
      setEditingWorkflow(workflow);
      setFormData({
        name: workflow.name,
        issue_type: workflow.issue_type,
        statuses: [...workflow.statuses]
      });
    } else {
      setEditingWorkflow(null);
      setFormData({
        name: '',
        issue_type: 'task',
        statuses: [
          { name: 'To Do', category: 'todo' },
          { name: 'In Progress', category: 'in_progress' },
          { name: 'Done', category: 'done' },
        ]
      });
    }
    setShowModal(true);
  };

  const handleAddStatus = () => {
    if (!newStatus.name.trim()) {
      toast.error('Status name is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      statuses: [...prev.statuses, { ...newStatus }]
    }));
    setNewStatus({ name: '', category: 'todo' });
  };

  const handleRemoveStatus = (index) => {
    setFormData(prev => ({
      ...prev,
      statuses: prev.statuses.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    if (formData.statuses.length < 2) {
      toast.error('At least 2 statuses are required');
      return;
    }

    try {
      if (editingWorkflow) {
        await api.put(`/workflows/${editingWorkflow.id}`, formData);
        toast.success('Workflow updated');
      } else {
        await api.post('/workflows', formData);
        toast.success('Workflow created');
      }
      setShowModal(false);
      fetchWorkflows();
    } catch (error) {
      toast.error('Failed to save workflow');
    }
  };

  const handleDelete = async (workflowId) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await api.delete(`/workflows/${workflowId}`);
      toast.success('Workflow deleted');
      fetchWorkflows();
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'todo': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <RefreshCw className="w-4 h-4" />;
      case 'done': return <CheckCircle2 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    return statusCategories.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" data-testid="workflows-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-violet-600" />
            Workflows
          </h1>
          <p className="text-gray-500 mt-1">
            Define custom status workflows for different issue types
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-2" /> Create Workflow
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-violet-50 border-violet-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-violet-600 mt-0.5" />
            <div>
              <p className="font-medium text-violet-900">How Workflows Work</p>
              <p className="text-sm text-violet-700 mt-1">
                Each issue type (Task, Bug, Story, etc.) can have its own workflow with custom statuses.
                Statuses are grouped into three categories: To Do, In Progress, and Done - which helps
                track overall progress and enables features like burndown charts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <div className="grid grid-cols-1 gap-4">
        {workflows.map(workflow => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                    <Badge variant="outline" className="mt-1">
                      {issueTypes.find(t => t.value === workflow.issue_type)?.label || workflow.issue_type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleOpenModal(workflow)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(workflow.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Status Flow */}
              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {workflow.statuses.map((status, idx) => (
                    <React.Fragment key={idx}>
                      <Badge className={`${getCategoryColor(status.category)} flex items-center gap-1.5 py-1.5 px-3`}>
                        {getCategoryIcon(status.category)}
                        {status.name}
                      </Badge>
                      {idx < workflow.statuses.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {workflows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No custom workflows</h3>
              <p className="text-gray-500 mt-1 mb-4">
                Create custom workflows to define how issues move through your process
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-2" /> Create Workflow
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Workflow Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Bug Workflow"
                />
              </div>
              <div>
                <Label>Issue Type</Label>
                <Select 
                  value={formData.issue_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, issue_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Statuses</Label>
              <div className="space-y-2 mb-4">
                {formData.statuses.map((status, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Badge className={getCategoryColor(status.category)}>
                      {status.category}
                    </Badge>
                    <span className="flex-1 font-medium">{status.name}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 w-7 p-0"
                      onClick={() => handleRemoveStatus(idx)}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg">
                <Input
                  value={newStatus.name}
                  onChange={(e) => setNewStatus(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Status name..."
                  className="flex-1"
                />
                <Select 
                  value={newStatus.category} 
                  onValueChange={(v) => setNewStatus(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddStatus}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
              {editingWorkflow ? 'Update' : 'Create'} Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowsPage;
