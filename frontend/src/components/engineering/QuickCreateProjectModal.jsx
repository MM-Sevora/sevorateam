import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { FolderKanban, Plus } from 'lucide-react';

const QuickCreateProjectModal = ({ open, onClose, onSuccess }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'active',
    department_id: ''
  });

  useEffect(() => {
    if (open) {
      // Fetch departments
      api.get('/departments').then(res => {
        setDepartments(res.data || []);
      }).catch(() => {});
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        status: 'active',
        department_id: ''
      });
    }
  }, [open, api]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.department_id) delete payload.department_id;
      
      await api.post('/projects', payload);
      toast.success('Project created successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-violet-600" />
            Quick Create Project
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label>Project Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name..."
              autoFocus
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {departments.length > 0 && (
            <div>
              <Label>Department (Optional)</Label>
              <Select 
                value={formData.department_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, department_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Button component that includes the modal
export const CreateProjectButton = ({ onSuccess, className = "", variant = "default", size = "default" }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)}
        className={className}
        variant={variant}
        size={size}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Project
      </Button>
      <QuickCreateProjectModal 
        open={showModal} 
        onClose={() => setShowModal(false)}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default QuickCreateProjectModal;
