import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  ShieldCheck, Plus, Trash2, GripVertical, Save, Loader2, Info, 
  AlertCircle, RefreshCw 
} from 'lucide-react';
import api from '../../../lib/api';

const ISSUE_TYPES = [
  { id: 'epic', label: 'Epic', color: 'bg-purple-100 text-purple-700' },
  { id: 'story', label: 'Story', color: 'bg-green-100 text-green-700' },
  { id: 'task', label: 'Task', color: 'bg-blue-100 text-blue-700' },
  { id: 'subtask', label: 'Subtask', color: 'bg-gray-100 text-gray-700' },
  { id: 'bug', label: 'Bug', color: 'bg-red-100 text-red-700' },
];

const DEFAULT_DOD_ITEMS = [
  { label: 'Code Review Completed', description: 'Code has been reviewed by at least one team member', is_required: true },
  { label: 'QA Testing Passed', description: 'All test cases passed, no critical bugs', is_required: true },
  { label: 'Documentation Updated', description: 'Technical docs and user guides updated if needed', is_required: false },
  { label: 'Deployed to Staging', description: 'Changes deployed and verified on staging environment', is_required: true },
];

const DoDConfigModal = ({ open, onClose, projectId, projectName }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    items: [],
    enabled_for_issue_types: ['task', 'bug'],
    is_enabled: true
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/dod/config/${projectId}`);
      setConfig({
        items: response.data.items || DEFAULT_DOD_ITEMS,
        enabled_for_issue_types: response.data.enabled_for_issue_types || ['task', 'bug'],
        is_enabled: response.data.is_enabled !== false
      });
    } catch (error) {
      console.error('Failed to fetch DoD config:', error);
      // Use defaults
      setConfig({
        items: DEFAULT_DOD_ITEMS,
        enabled_for_issue_types: ['task', 'bug'],
        is_enabled: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      fetchConfig();
    }
  }, [open, projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/projects/dod/config', {
        project_id: projectId,
        items: config.items,
        enabled_for_issue_types: config.enabled_for_issue_types,
        is_enabled: config.is_enabled
      });
      toast.success('DoD configuration saved');
      onClose();
    } catch (error) {
      console.error('Failed to save DoD config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setConfig(prev => ({
      ...prev,
      items: [...prev.items, { label: '', description: '', is_required: true }]
    }));
  };

  const handleRemoveItem = (index) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItem = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleToggleIssueType = (issueType) => {
    setConfig(prev => {
      const current = prev.enabled_for_issue_types || [];
      const updated = current.includes(issueType)
        ? current.filter(t => t !== issueType)
        : [...current, issueType];
      return { ...prev, enabled_for_issue_types: updated };
    });
  };

  const handleResetToDefaults = () => {
    setConfig(prev => ({
      ...prev,
      items: DEFAULT_DOD_ITEMS
    }));
    toast.info('Reset to default items');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
            Definition of Done Configuration
          </DialogTitle>
          <DialogDescription>
            Configure the checklist items that must be completed before tasks can be marked as "Done".
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-base font-medium">Enable Definition of Done</Label>
                <p className="text-sm text-gray-500 mt-0.5">
                  When enabled, tasks must complete the DoD checklist before moving to Done.
                </p>
              </div>
              <Switch
                checked={config.is_enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_enabled: checked }))}
              />
            </div>

            {/* Issue Types Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Applies to Issue Types</Label>
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 -mt-2">
                Select which issue types require Definition of Done completion.
              </p>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleToggleIssueType(type.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      config.enabled_for_issue_types?.includes(type.id)
                        ? `${type.color} ring-2 ring-violet-300 border-transparent`
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`dod-issue-type-${type.id}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Checklist Items</Label>
                <Button variant="ghost" size="sm" onClick={handleResetToDefaults}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset to Defaults
                </Button>
              </div>
              
              <div className="space-y-3">
                {config.items.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <GripVertical className="w-5 h-5 text-gray-300 mt-2 cursor-grab" />
                    
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.label}
                        onChange={(e) => handleUpdateItem(index, 'label', e.target.value)}
                        placeholder="Item label (e.g., Code Review Completed)"
                        className="font-medium"
                      />
                      <Textarea
                        value={item.description || ''}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        placeholder="Optional description..."
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${index}`}
                          checked={item.is_required}
                          onCheckedChange={(checked) => handleUpdateItem(index, 'is_required', checked)}
                        />
                        <label 
                          htmlFor={`required-${index}`}
                          className="text-sm text-gray-600 cursor-pointer"
                        >
                          Required (must be completed to mark task as Done)
                        </label>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {config.items.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No checklist items configured.</p>
                    <p className="text-gray-400 text-xs">Add items to define what "Done" means for this project.</p>
                  </div>
                )}
              </div>
              
              <Button variant="outline" onClick={handleAddItem} className="w-full">
                <Plus className="w-4 h-4 mr-1" />
                Add Checklist Item
              </Button>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">How it works</p>
                <p className="text-blue-700 text-xs mt-0.5">
                  When a task is dragged to the "Done" column, the system will check if all required DoD items are completed. 
                  If not, the move will be blocked and the user will be notified which items need attention.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-1" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DoDConfigModal;
