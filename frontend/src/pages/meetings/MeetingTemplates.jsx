import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Trash2, Edit, Copy, Clock, Users,
  Calendar, CheckCircle2, MoreVertical, Folder, Building2, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const categoryColors = {
  strategic: 'bg-purple-100 text-purple-700 border-purple-200',
  departmental: 'bg-blue-100 text-blue-700 border-blue-200',
  project: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  operational: 'bg-amber-100 text-amber-700 border-amber-200',
  individual: 'bg-rose-100 text-rose-700 border-rose-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200'
};

const meetingTypeLabels = {
  okr_review: 'OKR Review',
  leadership_strategy: 'Leadership Strategy',
  quarterly_business_review: 'Quarterly Business Review',
  department_weekly: 'Department Weekly',
  department_monthly: 'Department Monthly',
  project_kickoff: 'Project Kickoff',
  sprint_planning: 'Sprint Planning',
  project_review: 'Project Review',
  sprint_retrospective: 'Sprint Retrospective',
  weekly_team_review: 'Weekly Team Review',
  daily_standup: 'Daily Standup',
  one_on_one: 'One-on-One',
  performance_discussion: 'Performance Discussion',
  general: 'General'
};

const MeetingTemplates = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
    meeting_type: 'general',
    duration_minutes: 60,
    is_global: false,
    default_agenda: []
  });
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    start_time: '',
    location: '',
    meeting_link: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, [search, categoryFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sevora_token');
      let url = `${API}/api/meetings/templates?include_global=true`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (error) {
      toast.error('Error loading templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Template deleted');
        fetchTemplates();
      }
    } catch (error) {
      toast.error('Error deleting template');
    }
  };

  const handleEditTemplate = (template) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setForm({
      name: template.name || '',
      description: template.description || '',
      category: template.category || 'other',
      meeting_type: template.meeting_type || 'general',
      duration_minutes: template.duration_minutes || 60,
      is_global: template.is_global || false,
      default_agenda: template.default_agenda || []
    });
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!form.name) {
      toast.error('Template name is required');
      return;
    }

    try {
      const token = localStorage.getItem('sevora_token');
      const url = isEditMode 
        ? `${API}/api/meetings/templates/${editingTemplateId}`
        : `${API}/api/meetings/templates`;
      
      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(isEditMode ? 'Template updated' : 'Template created');
        handleCloseModal();
        fetchTemplates();
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} template`);
      }
    } catch (error) {
      toast.error(`Error ${isEditMode ? 'updating' : 'creating'} template`);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setIsEditMode(false);
    setEditingTemplateId(null);
    setForm({
      name: '',
      description: '',
      category: 'other',
      meeting_type: 'general',
      duration_minutes: 60,
      is_global: false,
      default_agenda: []
    });
  };

  const handleScheduleFromTemplate = async () => {
    if (!scheduleForm.title || !scheduleForm.start_time) {
      toast.error('Title and start time are required');
      return;
    }

    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/meetings/templates/${selectedTemplate.id}/create-meeting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: scheduleForm.title,
          start_time: new Date(scheduleForm.start_time).toISOString(),
          location: scheduleForm.location || null,
          meeting_link: scheduleForm.meeting_link || null
        })
      });

      if (res.ok) {
        const meeting = await res.json();
        toast.success('Meeting scheduled');
        setShowScheduleModal(false);
        setScheduleForm({ title: '', start_time: '', location: '', meeting_link: '' });
        navigate(`/meetings/${meeting.id}`);
      } else {
        toast.error('Failed to schedule meeting');
      }
    } catch (error) {
      toast.error('Error scheduling meeting');
    }
  };

  const openScheduleModal = (template) => {
    setSelectedTemplate(template);
    setScheduleForm({
      title: '',
      start_time: '',
      location: '',
      meeting_link: ''
    });
    setShowScheduleModal(true);
  };

  const addAgendaItem = () => {
    setForm({
      ...form,
      default_agenda: [
        ...form.default_agenda,
        { title: '', description: '', duration_minutes: 10 }
      ]
    });
  };

  const updateAgendaItem = (index, field, value) => {
    const newAgenda = [...form.default_agenda];
    newAgenda[index][field] = value;
    setForm({ ...form, default_agenda: newAgenda });
  };

  const removeAgendaItem = (index) => {
    setForm({
      ...form,
      default_agenda: form.default_agenda.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6" data-testid="meeting-templates-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Meeting Templates</h1>
          <p className="text-[#6B5D52] mt-1">Create and manage reusable meeting templates</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
          data-testid="create-template-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8B7E]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-10 border-[#D4BBA6]"
            data-testid="search-templates"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 border-[#D4BBA6]" data-testid="category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#D4BBA6]">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="strategic">Strategic</SelectItem>
            <SelectItem value="departmental">Departmental</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12 text-[#6B5D52]">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
            <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No Templates Yet</h3>
            <p className="text-[#6B5D52] mb-4">Create your first meeting template to streamline scheduling</p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="bg-white border-[#E8D5C4] shadow-sm hover:shadow-md transition-shadow"
              data-testid={`template-card-${template.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={categoryColors[template.category]}>
                        {template.category}
                      </Badge>
                      {template.is_global && (
                        <Badge variant="outline" className="bg-[#F5EBE0] text-[#5D4A3A]">
                          Global
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-[#4A3728] text-base">{template.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
                      <DropdownMenuItem
                        onClick={() => openScheduleModal(template)}
                        className="cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditTemplate(template)}
                        className="cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Template
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="cursor-pointer text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-[#5D4A3A] mb-3 line-clamp-2">{template.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-[#6B5D52]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {template.default_agenda?.length || 0} agenda items
                  </span>
                  {template.recurrence_type && template.recurrence_type !== 'none' && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      {template.recurrence_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8D5C4]">
                  <Badge variant="outline" className="text-xs bg-[#F5EBE0] text-[#5D4A3A]">
                    {meetingTypeLabels[template.meeting_type] || template.meeting_type}
                  </Badge>
                  {template.usage_count > 0 && (
                    <span className="text-xs text-[#6B5D52]">
                      Used {template.usage_count} times
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => openScheduleModal(template)}
                  className="w-full mt-3 bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
                  data-testid={`schedule-from-template-${template.id}`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              {isEditMode ? 'Edit Meeting Template' : 'Create Meeting Template'}
            </DialogTitle>
            <DialogDescription className="text-[#6B5D52]">
              {isEditMode ? 'Update this template\'s settings.' : 'Create a reusable template for recurring meeting types.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Template Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Weekly Team Standup"
                className="border-[#D4BBA6]"
                data-testid="template-name-input"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this template for?"
                className="border-[#D4BBA6]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="strategic">Strategic</SelectItem>
                    <SelectItem value="departmental">Departmental</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#4A3728]">Meeting Type</Label>
                <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v })}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="daily_standup">Daily Standup</SelectItem>
                    <SelectItem value="weekly_team_review">Weekly Team Review</SelectItem>
                    <SelectItem value="sprint_planning">Sprint Planning</SelectItem>
                    <SelectItem value="project_kickoff">Project Kickoff</SelectItem>
                    <SelectItem value="one_on_one">One-on-One</SelectItem>
                    <SelectItem value="okr_review">OKR Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
                  className="border-[#D4BBA6]"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="is_global"
                  checked={form.is_global}
                  onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
                  className="rounded border-[#D4BBA6]"
                />
                <Label htmlFor="is_global" className="text-[#4A3728] cursor-pointer">
                  Make available to all users
                </Label>
              </div>
            </div>

            {/* Default Agenda */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[#4A3728]">Default Agenda</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAgendaItem}
                  className="border-[#D4BBA6]"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>
              {form.default_agenda.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2 p-2 bg-[#F5EBE0] rounded">
                  <div className="flex-1">
                    <Input
                      value={item.title}
                      onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                      placeholder="Agenda item title"
                      className="border-[#D4BBA6] text-sm"
                    />
                  </div>
                  <Input
                    type="number"
                    value={item.duration_minutes}
                    onChange={(e) => updateAgendaItem(index, 'duration_minutes', parseInt(e.target.value) || 10)}
                    className="w-20 border-[#D4BBA6] text-sm"
                    placeholder="Min"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAgendaItem(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
              data-testid="submit-template-btn"
            >
              {isEditMode ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule from Template Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Schedule Meeting</DialogTitle>
            <DialogDescription className="text-[#6B5D52]">
              Create a meeting using "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#4A3728]">Meeting Title *</Label>
              <Input
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                placeholder="e.g., Monday Standup"
                className="border-[#D4BBA6]"
                data-testid="schedule-title-input"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Start Time *</Label>
              <Input
                type="datetime-local"
                value={scheduleForm.start_time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                className="border-[#D4BBA6]"
                data-testid="schedule-time-input"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Location</Label>
              <Input
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                placeholder="Room name or address"
                className="border-[#D4BBA6]"
              />
            </div>
            <div>
              <Label className="text-[#4A3728]">Meeting Link</Label>
              <Input
                value={scheduleForm.meeting_link}
                onChange={(e) => setScheduleForm({ ...scheduleForm, meeting_link: e.target.value })}
                placeholder="Video call link"
                className="border-[#D4BBA6]"
              />
            </div>

            {selectedTemplate && (
              <div className="p-3 bg-[#F5EBE0] rounded-lg">
                <p className="text-sm text-[#5D4A3A] mb-2">Template settings:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="bg-white">
                    <Clock className="w-3 h-3 mr-1" />
                    {selectedTemplate.duration_minutes} min
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    {meetingTypeLabels[selectedTemplate.meeting_type]}
                  </Badge>
                  {selectedTemplate.default_agenda?.length > 0 && (
                    <Badge variant="outline" className="bg-white">
                      {selectedTemplate.default_agenda.length} agenda items
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button
              onClick={handleScheduleFromTemplate}
              className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
              data-testid="schedule-meeting-btn"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingTemplates;
