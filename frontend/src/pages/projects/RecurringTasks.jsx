import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Plus, Search, Filter, MoreVertical, Edit, Trash2, Play, Pause,
  Calendar, User, Clock, CheckCircle2, AlertTriangle, Loader2, Target,
  ChevronRight, Settings, BarChart3, Zap, TrendingUp, AlertCircle, Folder,
  PieChart, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const recurrenceTypeLabels = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom'
};

const weekDays = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' }
];

const weekOfMonthOptions = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' }
];

// ============== RECURRING TEMPLATE CARD ==============

const RecurringTemplateCard = ({ template, onEdit, onDelete, onPause, onResume, onGenerateNow }) => {
  const navigate = useNavigate();
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card 
      className={`group hover:shadow-md transition-all duration-200 cursor-pointer border-[#E8D5C4] hover:border-[#D4BBA6] shadow-sm ${
        template.is_paused ? 'opacity-70 bg-stone-50' : 'bg-white'
      }`}
      data-testid={`recurring-template-${template.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${template.is_paused ? 'bg-stone-100' : 'bg-emerald-100'}`}>
              <RefreshCw className={`w-5 h-5 ${template.is_paused ? 'text-stone-500' : 'text-emerald-700'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-[#4A3728] line-clamp-1">{template.name}</h3>
              <p className="text-xs text-[#5D4A3A]">{template.recurrence_description}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4 text-[#5D4A3A]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <DropdownMenuItem onClick={() => onEdit(template)} className="cursor-pointer text-[#4A3728]">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGenerateNow(template)} className="cursor-pointer text-[#4A3728]">
                <Zap className="w-4 h-4 mr-2" /> Generate Now
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#E8D5C4]" />
              {template.is_paused ? (
                <DropdownMenuItem onClick={() => onResume(template)} className="cursor-pointer text-emerald-600">
                  <Play className="w-4 h-4 mr-2" /> Resume
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onPause(template)} className="cursor-pointer text-amber-600">
                  <Pause className="w-4 h-4 mr-2" /> Pause
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(template)} className="cursor-pointer text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className={`text-xs ${
            template.is_paused 
              ? 'bg-stone-100 text-stone-600 border-stone-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
          }`}>
            {template.is_paused ? 'Paused' : 'Active'}
          </Badge>
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
            {recurrenceTypeLabels[template.recurrence_type]}
          </Badge>
          {template.project_name && (
            <Badge variant="outline" className="text-xs bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6]">
              {template.project_name}
            </Badge>
          )}
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-2 text-xs text-[#5D4A3A]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#6B5D52]" />
            <span>Next: {template.next_occurrence ? formatDate(template.next_occurrence) : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6B5D52]" />
            <span>Generated: {template.occurrences_generated}</span>
          </div>
          {template.assigned_to_name && (
            <div className="flex items-center gap-1.5 col-span-2">
              <User className="w-3.5 h-3.5 text-[#6B5D52]" />
              <span>{template.assigned_to_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============== CREATE/EDIT MODAL ==============

const RecurringTemplateModal = ({ open, onClose, template, projects, departments, users, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_id: '',
    department_id: '',
    assigned_to: '',
    priority: 'medium',
    tags: [],
    estimated_hours: null,
    recurrence_type: 'weekly',
    frequency: 1,
    repeat_on_days: [0], // Monday by default
    monthly_repeat_type: 'day_of_month',
    day_of_month: 1,
    week_of_month: 1,
    weekday_of_month: 0,
    recurrence_end_type: 'never',
    end_date: '',
    max_occurrences: 10,
    start_date: new Date().toISOString().split('T')[0],
    task_due_offset_days: 0
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        project_id: template.project_id || '',
        department_id: template.department_id || '',
        assigned_to: template.assigned_to || '',
        priority: template.priority || 'medium',
        tags: template.tags || [],
        estimated_hours: template.estimated_hours || null,
        recurrence_type: template.recurrence_type || 'weekly',
        frequency: template.frequency || 1,
        repeat_on_days: template.repeat_on_days || [0],
        monthly_repeat_type: template.monthly_repeat_type || 'day_of_month',
        day_of_month: template.day_of_month || 1,
        week_of_month: template.week_of_month || 1,
        weekday_of_month: template.weekday_of_month || 0,
        recurrence_end_type: template.recurrence_end_type || 'never',
        end_date: template.end_date?.split('T')[0] || '',
        max_occurrences: template.max_occurrences || 10,
        start_date: template.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        task_due_offset_days: template.task_due_offset_days || 0
      });
    } else {
      setFormData({
        name: '',
        description: '',
        project_id: '',
        department_id: '',
        assigned_to: '',
        priority: 'medium',
        tags: [],
        estimated_hours: null,
        recurrence_type: 'weekly',
        frequency: 1,
        repeat_on_days: [0],
        monthly_repeat_type: 'day_of_month',
        day_of_month: 1,
        week_of_month: 1,
        weekday_of_month: 0,
        recurrence_end_type: 'never',
        end_date: '',
        max_occurrences: 10,
        start_date: new Date().toISOString().split('T')[0],
        task_due_offset_days: 0
      });
    }
  }, [template, open]);

  const handleWeekDayToggle = (day) => {
    const current = formData.repeat_on_days;
    if (current.includes(day)) {
      if (current.length > 1) {
        setFormData({ ...formData, repeat_on_days: current.filter(d => d !== day) });
      }
    } else {
      setFormData({ ...formData, repeat_on_days: [...current, day].sort() });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Task name is required');
      return;
    }
    if (!formData.start_date) {
      toast.error('Start date is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const method = template ? 'PUT' : 'POST';
      const url = template 
        ? `${API}/api/projects/recurring-templates/${template.id}`
        : `${API}/api/projects/recurring-templates`;

      const payload = { ...formData };
      if (!payload.project_id) delete payload.project_id;
      if (!payload.department_id) delete payload.department_id;
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.estimated_hours) delete payload.estimated_hours;
      if (payload.recurrence_end_type !== 'end_date') delete payload.end_date;
      if (payload.recurrence_end_type !== 'after_occurrences') delete payload.max_occurrences;

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(template ? 'Template updated' : 'Recurring task created');
        onSuccess();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to save');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save recurring task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#D4BBA6] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#4A3728] flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            {template ? 'Edit Recurring Task' : 'Create Recurring Task'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="task" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#F5EBE0]">
            <TabsTrigger value="task" className="data-[state=active]:bg-white">
              Task Details
            </TabsTrigger>
            <TabsTrigger value="recurrence" className="data-[state=active]:bg-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recurrence
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            {/* Task Details Tab */}
            <TabsContent value="task" className="mt-0 space-y-4">
              <div>
                <Label className="text-[#4A3728]">Task Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekly Team Meeting"
                  className="border-[#D4BBA6] mt-1"
                  data-testid="recurring-task-name"
                />
              </div>

              <div>
                <Label className="text-[#4A3728]">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description..."
                  className="border-[#D4BBA6] mt-1 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Project (Optional)</Label>
                  <Select
                    value={formData.project_id || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, project_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="border-[#D4BBA6] mt-1">
                      <SelectValue placeholder="Standalone task" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                      <SelectItem value="none">Standalone (No Project)</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Assigned To</Label>
                  <Select
                    value={formData.assigned_to || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, assigned_to: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="border-[#D4BBA6] mt-1">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger className="border-[#D4BBA6] mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Due After (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.task_due_offset_days}
                    onChange={(e) => setFormData({ ...formData, task_due_offset_days: parseInt(e.target.value) || 0 })}
                    className="border-[#D4BBA6] mt-1"
                    placeholder="Days after generation"
                  />
                  <p className="text-xs text-[#9C8C74] mt-1">Task due X days after generation (0 = no due date)</p>
                </div>
              </div>
            </TabsContent>

            {/* Recurrence Tab */}
            <TabsContent value="recurrence" className="mt-0 space-y-4">
              <div>
                <Label className="text-[#4A3728]">Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="border-[#D4BBA6] mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Repeat Type</Label>
                  <Select
                    value={formData.recurrence_type}
                    onValueChange={(v) => setFormData({ ...formData, recurrence_type: v })}
                  >
                    <SelectTrigger className="border-[#D4BBA6] mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Every</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 1 })}
                      className="border-[#D4BBA6] w-20"
                    />
                    <span className="text-sm text-[#6B5D52]">
                      {formData.recurrence_type === 'daily' && (formData.frequency === 1 ? 'day' : 'days')}
                      {formData.recurrence_type === 'weekly' && (formData.frequency === 1 ? 'week' : 'weeks')}
                      {formData.recurrence_type === 'monthly' && (formData.frequency === 1 ? 'month' : 'months')}
                      {formData.recurrence_type === 'quarterly' && (formData.frequency === 1 ? 'quarter' : 'quarters')}
                      {formData.recurrence_type === 'yearly' && (formData.frequency === 1 ? 'year' : 'years')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly: Select days */}
              {formData.recurrence_type === 'weekly' && (
                <div>
                  <Label className="text-[#4A3728]">Repeat On</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {weekDays.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={formData.repeat_on_days.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleWeekDayToggle(day.value)}
                        className={formData.repeat_on_days.includes(day.value) 
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                          : "border-[#D4BBA6]"
                        }
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly: Select day type */}
              {formData.recurrence_type === 'monthly' && (
                <div className="space-y-3">
                  <Label className="text-[#4A3728]">Repeat On</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="day_of_month"
                      checked={formData.monthly_repeat_type === 'day_of_month'}
                      onChange={() => setFormData({ ...formData, monthly_repeat_type: 'day_of_month' })}
                      className="text-indigo-600"
                    />
                    <label htmlFor="day_of_month" className="text-sm">Day</label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })}
                      className="border-[#D4BBA6] w-20"
                      disabled={formData.monthly_repeat_type !== 'day_of_month'}
                    />
                    <span className="text-sm text-[#6B5D52]">of the month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="weekday_of_month"
                      checked={formData.monthly_repeat_type === 'weekday_of_month'}
                      onChange={() => setFormData({ ...formData, monthly_repeat_type: 'weekday_of_month' })}
                      className="text-indigo-600"
                    />
                    <label htmlFor="weekday_of_month" className="text-sm">The</label>
                    <Select
                      value={String(formData.week_of_month)}
                      onValueChange={(v) => setFormData({ ...formData, week_of_month: parseInt(v) })}
                      disabled={formData.monthly_repeat_type !== 'weekday_of_month'}
                    >
                      <SelectTrigger className="border-[#D4BBA6] w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        {weekOfMonthOptions.map(w => (
                          <SelectItem key={w.value} value={String(w.value)}>{w.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(formData.weekday_of_month)}
                      onValueChange={(v) => setFormData({ ...formData, weekday_of_month: parseInt(v) })}
                      disabled={formData.monthly_repeat_type !== 'weekday_of_month'}
                    >
                      <SelectTrigger className="border-[#D4BBA6] w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        {weekDays.map(d => (
                          <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* End condition */}
              <div className="border-t border-[#E8D5C4] pt-4">
                <Label className="text-[#4A3728]">Ends</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="never"
                      checked={formData.recurrence_end_type === 'never'}
                      onChange={() => setFormData({ ...formData, recurrence_end_type: 'never' })}
                      className="text-indigo-600"
                    />
                    <label htmlFor="never" className="text-sm">Never</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="end_date"
                      checked={formData.recurrence_end_type === 'end_date'}
                      onChange={() => setFormData({ ...formData, recurrence_end_type: 'end_date' })}
                      className="text-indigo-600"
                    />
                    <label htmlFor="end_date" className="text-sm">On</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="border-[#D4BBA6] w-40"
                      disabled={formData.recurrence_end_type !== 'end_date'}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="after_occurrences"
                      checked={formData.recurrence_end_type === 'after_occurrences'}
                      onChange={() => setFormData({ ...formData, recurrence_end_type: 'after_occurrences' })}
                      className="text-indigo-600"
                    />
                    <label htmlFor="after_occurrences" className="text-sm">After</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.max_occurrences}
                      onChange={(e) => setFormData({ ...formData, max_occurrences: parseInt(e.target.value) || 1 })}
                      className="border-[#D4BBA6] w-20"
                      disabled={formData.recurrence_end_type !== 'after_occurrences'}
                    />
                    <span className="text-sm text-[#6B5D52]">occurrences</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-[#E8D5C4] pt-4 mt-4">
          <Button variant="outline" onClick={onClose} className="border-[#D4BBA6]">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {template ? 'Update' : 'Create'} Recurring Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============== MAIN PAGE ==============

const RecurringTasks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [filters, setFilters] = useState({
    search: '',
    recurrence_type: 'all',
    status: 'all',
    project_id: 'all'
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const params = new URLSearchParams();
      if (filters.recurrence_type !== 'all') params.append('recurrence_type', filters.recurrence_type);
      if (filters.status === 'active') {
        params.append('is_active', 'true');
        params.append('is_paused', 'false');
      } else if (filters.status === 'paused') {
        params.append('is_paused', 'true');
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.project_id !== 'all') params.append('project_id', filters.project_id);

      const res = await fetch(`${API}/api/projects/recurring-templates?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [filters]);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/recurring-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const [projectsRes, usersRes] = await Promise.all([
        fetch(`${API}/api/projects/list`, { headers: { 'Authorization': `Bearer ${token}` }}),
        fetch(`${API}/api/users`, { headers: { 'Authorization': `Bearer ${token}` }})
      ]);
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (usersRes.ok) {
        const allUsers = await usersRes.json();
        setUsers(allUsers.filter(u => u.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchDashboard(), fetchMetadata()]);
      setLoading(false);
    };
    load();
  }, [fetchTemplates]);

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete recurring task "${template.name}"? This will stop future task generation.`)) return;
    
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/recurring-templates/${template.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Recurring task deleted');
        fetchTemplates();
        fetchDashboard();
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handlePause = async (template) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/recurring-templates/${template.id}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Recurring task paused');
        fetchTemplates();
        fetchDashboard();
      }
    } catch (error) {
      toast.error('Failed to pause');
    }
  };

  const handleResume = async (template) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/recurring-templates/${template.id}/resume`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Recurring task resumed');
        fetchTemplates();
        fetchDashboard();
      }
    } catch (error) {
      toast.error('Failed to resume');
    }
  };

  const handleGenerateNow = async (template) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/recurring-templates/${template.id}/generate-now`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Task generated successfully');
        fetchTemplates();
        fetchDashboard();
      }
    } catch (error) {
      toast.error('Failed to generate task');
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" data-testid="recurring-tasks-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Recurring Tasks</h1>
          <p className="text-[#5D4A3A] mt-1">Manage automated task schedules</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => { fetchTemplates(); fetchDashboard(); }}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm"
            onClick={() => { setEditingTemplate(null); setShowModal(true); }}
            className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
            data-testid="create-recurring-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Recurring Task
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F5EBE0] p-1">
          <TabsTrigger value="templates" className="data-[state=active]:bg-white px-6">
            <RefreshCw className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white px-6">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard & Reports
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6 space-y-6">
          {/* Quick Stats */}
          {dashboard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white border-[#E8D5C4] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#5D4A3A] text-sm">Active Templates</p>
                      <p className="text-3xl font-bold text-[#4A3728] mt-1">{dashboard.active_templates}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-emerald-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#E8D5C4] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#5D4A3A] text-sm">Paused</p>
                      <p className="text-3xl font-bold text-[#4A3728] mt-1">{dashboard.paused_templates}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Pause className="w-6 h-6 text-amber-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#E8D5C4] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#5D4A3A] text-sm">Generated Today</p>
                      <p className="text-3xl font-bold text-[#4A3728] mt-1">{dashboard.tasks_generated_today}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#E8D5C4] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#5D4A3A] text-sm">This Week</p>
                      <p className="text-3xl font-bold text-[#4A3728] mt-1">{dashboard.tasks_generated_this_week}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-purple-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8C74]" />
                  <Input
                    placeholder="Search recurring tasks..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9 border-[#D4BBA6]"
                  />
                </div>
                <Select value={filters.project_id} onValueChange={(v) => setFilters({ ...filters, project_id: v })}>
                  <SelectTrigger className="w-[180px] border-[#D4BBA6]">
                    <Folder className="w-4 h-4 mr-2 text-[#6B5D52]" />
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.recurrence_type} onValueChange={(v) => setFilters({ ...filters, recurrence_type: v })}>
                  <SelectTrigger className="w-[140px] border-[#D4BBA6]">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger className="w-[140px] border-[#D4BBA6]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <RecurringTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPause={handlePause}
                  onResume={handleResume}
                  onGenerateNow={handleGenerateNow}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="py-16 text-center">
                <RefreshCw className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
                <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No Recurring Tasks</h3>
                <p className="text-[#6B5D52] mb-4">
                  Create recurring tasks to automate routine work
                </p>
                <Button 
                  onClick={() => { setEditingTemplate(null); setShowModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Recurring Task
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Occurrences */}
          {dashboard?.upcoming_occurrences?.length > 0 && (
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Upcoming Occurrences (Next 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.upcoming_occurrences.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="font-medium text-[#4A3728]">{item.name}</p>
                          <p className="text-xs text-[#6B5D52]">
                            {recurrenceTypeLabels[item.recurrence_type]} • {item.assigned_to_name || 'Unassigned'}
                            {item.project_name && <span> • {item.project_name}</span>}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-white text-[#5D4A3A]">
                        {new Date(item.next_occurrence).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dashboard & Reports Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {dashboard && (
            <>
              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#5D4A3A] text-sm">Total Templates</p>
                        <p className="text-2xl font-bold text-[#4A3728] mt-1">{dashboard.total_templates}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-slate-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#5D4A3A] text-sm">Tasks Generated</p>
                        <p className="text-2xl font-bold text-[#4A3728] mt-1">{dashboard.total_generated_all_time || 0}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#5D4A3A] text-sm">Completion Rate</p>
                        <p className="text-2xl font-bold text-[#4A3728] mt-1">{dashboard.completion_rate || 0}%</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <PieChart className="w-5 h-5 text-blue-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#5D4A3A] text-sm">Completed</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{dashboard.completed_recurring || 0}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#5D4A3A] text-sm">In Progress</p>
                        <p className="text-2xl font-bold text-[#4A3728] mt-1">{dashboard.in_progress_recurring || 0}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#5D4A3A] text-sm">Overdue</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{dashboard.overdue_recurring || 0}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Trend */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                      <TrendingUp className="w-5 h-5 text-[#4A3728]" />
                      Weekly Generation Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.weekly_trend?.length > 0 ? (
                      <div className="space-y-3">
                        {dashboard.weekly_trend.map((week, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs text-[#6B5D52] w-16">{week.week_start}</span>
                            <div className="flex-1 h-6 bg-[#F5EBE0] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#4A3728] rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(100, (week.count / Math.max(...dashboard.weekly_trend.map(w => w.count), 1)) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[#4A3728] w-8 text-right">{week.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* By Frequency */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                      <PieChart className="w-5 h-5 text-[#4A3728]" />
                      Templates by Frequency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.by_frequency && (
                      <div className="space-y-3">
                        {Object.entries(dashboard.by_frequency).map(([freq, count]) => (
                          <div key={freq} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                freq === 'daily' ? 'bg-blue-500' :
                                freq === 'weekly' ? 'bg-emerald-500' :
                                freq === 'monthly' ? 'bg-purple-500' :
                                freq === 'quarterly' ? 'bg-amber-500' : 'bg-slate-500'
                              }`} />
                              <span className="text-sm text-[#4A3728] capitalize">{freq}</span>
                            </div>
                            <Badge variant="outline" className="bg-[#F5EBE0] border-[#D4BBA6]">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Templates */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                      <Target className="w-5 h-5 text-[#4A3728]" />
                      Top Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.top_templates?.length > 0 ? (
                      <div className="space-y-2">
                        {dashboard.top_templates.map((t, idx) => (
                          <div key={t.id} className="flex items-center justify-between p-2 bg-[#F5EBE0] rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 flex items-center justify-center bg-[#4A3728] text-white text-xs font-bold rounded">
                                {idx + 1}
                              </span>
                              <span className="text-sm text-[#4A3728] truncate max-w-[140px]">{t.name}</span>
                            </div>
                            <span className="text-xs text-[#6B5D52]">{t.occurrences_generated} generated</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No templates yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* By Project */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                      <Folder className="w-5 h-5 text-[#4A3728]" />
                      By Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.by_project?.length > 0 ? (
                      <div className="space-y-2">
                        {dashboard.by_project.map((p, idx) => (
                          <div key={p.project_id} className="flex items-center justify-between p-2 bg-[#F5EBE0] rounded-lg">
                            <span className="text-sm text-[#4A3728] truncate max-w-[160px]">{p.project_name}</span>
                            <Badge variant="outline" className="bg-white border-[#D4BBA6]">{p.template_count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No project assignments</p>
                    )}
                  </CardContent>
                </Card>

                {/* By Assignee */}
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#4A3728] flex items-center gap-2 text-base">
                      <Users className="w-5 h-5 text-[#4A3728]" />
                      By Assignee
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.by_assignee?.length > 0 ? (
                      <div className="space-y-2">
                        {dashboard.by_assignee.map((a, idx) => (
                          <div key={a.user_id} className="flex items-center justify-between p-2 bg-[#F5EBE0] rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                                <User className="w-3 h-3 text-[#4A3728]" />
                              </div>
                              <span className="text-sm text-[#4A3728] truncate max-w-[120px]">{a.user_name}</span>
                            </div>
                            <Badge variant="outline" className="bg-white border-[#D4BBA6]">{a.template_count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#6B5D52] text-center py-4">No assignees</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <RecurringTemplateModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTemplate(null); }}
        template={editingTemplate}
        projects={projects}
        departments={departments}
        users={users}
        onSuccess={() => { fetchTemplates(); fetchDashboard(); }}
      />
    </div>
  );
};

export default RecurringTasks;
