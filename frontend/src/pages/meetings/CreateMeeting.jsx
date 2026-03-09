import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Users, Target, Folder, Building2,
  Plus, Trash2, ArrowLeft, Save, Video, FileText, Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const meetingTypes = [
  { value: 'general', label: 'General Meeting' },
  { value: 'okr_review', label: 'OKR Review', category: 'Strategic' },
  { value: 'leadership_strategy', label: 'Leadership Strategy', category: 'Strategic' },
  { value: 'quarterly_business_review', label: 'Quarterly Business Review', category: 'Strategic' },
  { value: 'department_weekly', label: 'Department Weekly', category: 'Department' },
  { value: 'department_monthly', label: 'Department Monthly', category: 'Department' },
  { value: 'project_kickoff', label: 'Project Kickoff', category: 'Project' },
  { value: 'sprint_planning', label: 'Sprint Planning', category: 'Project' },
  { value: 'project_review', label: 'Project Review', category: 'Project' },
  { value: 'sprint_retrospective', label: 'Sprint Retrospective', category: 'Project' },
  { value: 'weekly_team_review', label: 'Weekly Team Review', category: 'Operational' },
  { value: 'daily_standup', label: 'Daily Standup', category: 'Operational' },
  { value: 'one_on_one', label: 'One-on-One', category: 'Individual' },
  { value: 'performance_discussion', label: 'Performance Discussion', category: 'Individual' }
];

const recurrenceTypes = [
  { value: 'none', label: 'No Recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }
];

const CreateMeeting = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Options data
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    meeting_type: 'general',
    description: '',
    start_date: '',
    start_time: '09:00',
    end_time: '10:00',
    timezone: 'UTC',
    location: '',
    meeting_link: '',
    department_id: '',
    linked_goal_id: '',
    linked_objective_id: '',
    linked_project_id: '',
    visibility: 'public',
    sync_to_outlook: false,
    recurrence_type: 'none',
    recurrence_end_date: ''
  });
  
  const [agenda, setAgenda] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [preReadDocuments, setPreReadDocuments] = useState([]);

  // Pre-fill from URL params (when creating from Project/Goal page)
  useEffect(() => {
    const projectId = searchParams.get('project_id');
    const goalId = searchParams.get('goal_id');
    const objectiveId = searchParams.get('objective_id');
    const meetingType = searchParams.get('type');
    
    if (projectId || goalId || objectiveId || meetingType) {
      setFormData(prev => ({
        ...prev,
        linked_project_id: projectId || '',
        linked_goal_id: goalId || '',
        linked_objective_id: objectiveId || '',
        meeting_type: meetingType || 'general'
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchOptions = async () => {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        // Fetch departments
        const deptRes = await fetch(`${API}/api/departments`, { headers });
        if (deptRes.ok) setDepartments(await deptRes.json());

        // Fetch projects
        const projRes = await fetch(`${API}/api/projects/list`, { headers });
        if (projRes.ok) {
          const data = await projRes.json();
          setProjects(data.projects || data || []);
        }

        // Fetch goals
        const goalsRes = await fetch(`${API}/api/strategic-goals`, { headers });
        if (goalsRes.ok) setGoals(await goalsRes.json());

        // Fetch objectives
        const objRes = await fetch(`${API}/api/objectives`, { headers });
        if (objRes.ok) setObjectives(await objRes.json());

        // Fetch users
        const usersRes = await fetch(`${API}/api/users`, { headers });
        if (usersRes.ok) setUsers(await usersRes.json());
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };

    fetchOptions();
  }, []);

  const addAgendaItem = () => {
    setAgenda([...agenda, {
      title: '',
      description: '',
      presenter_id: '',
      duration_minutes: 10
    }]);
  };

  const updateAgendaItem = (index, field, value) => {
    const updated = [...agenda];
    updated[index][field] = value;
    setAgenda(updated);
  };

  const removeAgendaItem = (index) => {
    setAgenda(agenda.filter((_, i) => i !== index));
  };

  const addParticipant = (userId) => {
    if (!userId || participants.find(p => p.user_id === userId)) return;
    const user = users.find(u => u.id === userId);
    if (user) {
      setParticipants([...participants, {
        user_id: userId,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: 'attendee'
      }]);
    }
  };

  const removeParticipant = (userId) => {
    setParticipants(participants.filter(p => p.user_id !== userId));
  };

  const addPreReadDocument = () => {
    setPreReadDocuments([...preReadDocuments, {
      title: '',
      url: '',
      file_type: 'link',
      description: ''
    }]);
  };

  const updatePreReadDocument = (index, field, value) => {
    const updated = [...preReadDocuments];
    updated[index][field] = value;
    setPreReadDocuments(updated);
  };

  const removePreReadDocument = (index) => {
    setPreReadDocuments(preReadDocuments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.start_date) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('sevora_token');
      
      // Build datetime strings
      const startDateTime = `${formData.start_date}T${formData.start_time}:00Z`;
      const endDateTime = `${formData.start_date}T${formData.end_time}:00Z`;

      const payload = {
        title: formData.title,
        meeting_type: formData.meeting_type,
        description: formData.description,
        start_time: startDateTime,
        end_time: endDateTime,
        timezone: formData.timezone,
        location: formData.location || null,
        meeting_link: formData.meeting_link || null,
        department_id: formData.department_id || null,
        linked_goal_id: formData.linked_goal_id || null,
        linked_objective_id: formData.linked_objective_id || null,
        linked_project_id: formData.linked_project_id || null,
        visibility: formData.visibility,
        agenda: agenda.filter(a => a.title),
        participants: participants,
        pre_read_documents: preReadDocuments.filter(d => d.title),
        sync_to_outlook: formData.sync_to_outlook,
        recurrence_type: formData.recurrence_type || 'none',
        recurrence_end_date: formData.recurrence_end_date ? `${formData.recurrence_end_date}T23:59:59Z` : null
      };

      const res = await fetch(`${API}/api/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const meeting = await res.json();
        toast.success('Meeting created successfully');
        navigate(`/meetings/${meeting.id}`);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to create meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Error creating meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6" data-testid="create-meeting-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/meetings')}
            className="text-[#4A3728]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#4A3728]">Schedule Meeting</h1>
            <p className="text-[#5D4A3A] mt-1">Create a new meeting linked to goals and projects</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
          data-testid="save-meeting-btn"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Creating...' : 'Create Meeting'}
        </Button>
      </div>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F5EBE0] p-1">
          <TabsTrigger value="details" className="data-[state=active]:bg-white px-6">
            <Calendar className="w-4 h-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="agenda" className="data-[state=active]:bg-white px-6">
            <FileText className="w-4 h-4 mr-2" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="participants" className="data-[state=active]:bg-white px-6">
            <Users className="w-4 h-4 mr-2" />
            Participants
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-white px-6">
            <LinkIcon className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#4A3728]">Meeting Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Q1 Product Review"
                    className="border-[#D4BBA6]"
                  />
                </div>

                <div>
                  <Label className="text-[#4A3728]">Meeting Type</Label>
                  <Select value={formData.meeting_type} onValueChange={(v) => setFormData({ ...formData, meeting_type: v })}>
                    <SelectTrigger className="border-[#D4BBA6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      {meetingTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.category && <span className="text-[#9C8C74]">{type.category}: </span>}
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[#4A3728]">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Meeting objectives and notes..."
                    className="border-[#D4BBA6] min-h-[100px]"
                  />
                </div>

                <div>
                  <Label className="text-[#4A3728]">Visibility</Label>
                  <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                    <SelectTrigger className="border-[#D4BBA6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="public">Public - Visible to all employees</SelectItem>
                      <SelectItem value="department">Department - Visible to department members</SelectItem>
                      <SelectItem value="private">Private - Visible only to participants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#4A3728]">Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="border-[#D4BBA6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">Start Time</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="border-[#D4BBA6]"
                    />
                  </div>
                  <div>
                    <Label className="text-[#4A3728]">End Time</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="border-[#D4BBA6]"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#4A3728]">Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Conference Room A"
                    className="border-[#D4BBA6]"
                  />
                </div>

                <div>
                  <Label className="text-[#4A3728]">Meeting Link</Label>
                  <Input
                    value={formData.meeting_link}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    className="border-[#D4BBA6]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#4A3728]" />
                    <span className="text-sm text-[#4A3728]">Sync to Microsoft Outlook</span>
                  </div>
                  <Switch
                    checked={formData.sync_to_outlook}
                    onCheckedChange={(v) => setFormData({ ...formData, sync_to_outlook: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recurrence Settings */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Recurring Meeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#4A3728]">Recurrence Pattern</Label>
                  <Select 
                    value={formData.recurrence_type} 
                    onValueChange={(v) => setFormData({ ...formData, recurrence_type: v })}
                  >
                    <SelectTrigger className="border-[#D4BBA6]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      {recurrenceTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrence_type !== 'none' && (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <RefreshCw className="w-4 h-4 inline mr-1" />
                        This meeting will automatically repeat <strong>{formData.recurrence_type}</strong>.
                        When you complete a meeting, the next occurrence will be created automatically.
                      </p>
                    </div>

                    <div>
                      <Label className="text-[#4A3728]">Recurrence End Date (Optional)</Label>
                      <Input
                        type="date"
                        value={formData.recurrence_end_date}
                        onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                        className="border-[#D4BBA6]"
                        min={formData.start_date}
                      />
                      <p className="text-xs text-[#6B5D52] mt-1">
                        Leave empty for indefinite recurrence
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Linkage */}
            <Card className="bg-white border-[#E8D5C4] shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#4A3728] text-base">Link to Goals & Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-[#4A3728]">Department</Label>
                    <Select value={formData.department_id || "none"} onValueChange={(v) => setFormData({ ...formData, department_id: v === "none" ? "" : v })}>
                      <SelectTrigger className="border-[#D4BBA6]">
                        <Building2 className="w-4 h-4 mr-2 text-[#6B5D52]" />
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        <SelectItem value="none">None</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[#4A3728]">Company Goal</Label>
                    <Select value={formData.linked_goal_id || "none"} onValueChange={(v) => setFormData({ ...formData, linked_goal_id: v === "none" ? "" : v })}>
                      <SelectTrigger className="border-[#D4BBA6]">
                        <Target className="w-4 h-4 mr-2 text-[#6B5D52]" />
                        <SelectValue placeholder="Select goal" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        <SelectItem value="none">None</SelectItem>
                        {goals.map(goal => (
                          <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[#4A3728]">Objective</Label>
                    <Select value={formData.linked_objective_id || "none"} onValueChange={(v) => setFormData({ ...formData, linked_objective_id: v === "none" ? "" : v })}>
                      <SelectTrigger className="border-[#D4BBA6]">
                        <Target className="w-4 h-4 mr-2 text-[#6B5D52]" />
                        <SelectValue placeholder="Select objective" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        <SelectItem value="none">None</SelectItem>
                        {objectives.map(obj => (
                          <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[#4A3728]">Project</Label>
                    <Select value={formData.linked_project_id || "none"} onValueChange={(v) => setFormData({ ...formData, linked_project_id: v === "none" ? "" : v })}>
                      <SelectTrigger className="border-[#D4BBA6]">
                        <Folder className="w-4 h-4 mr-2 text-[#6B5D52]" />
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D4BBA6]">
                        <SelectItem value="none">None</SelectItem>
                        {projects.map(proj => (
                          <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agenda Tab */}
        <TabsContent value="agenda" className="mt-6">
          <Card className="bg-white border-[#E8D5C4] shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[#4A3728] text-base">Meeting Agenda</CardTitle>
              <Button size="sm" variant="outline" onClick={addAgendaItem} className="border-[#D4BBA6]">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {agenda.length > 0 ? (
                <div className="space-y-4">
                  {agenda.map((item, index) => (
                    <div key={index} className="p-4 bg-[#F5EBE0] rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className="bg-white">{index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAgendaItem(index)}
                          className="text-red-600 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-[#4A3728] text-xs">Topic</Label>
                          <Input
                            value={item.title}
                            onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                            placeholder="Agenda topic"
                            className="border-[#D4BBA6] bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-[#4A3728] text-xs">Duration (min)</Label>
                          <Input
                            type="number"
                            value={item.duration_minutes}
                            onChange={(e) => updateAgendaItem(index, 'duration_minutes', parseInt(e.target.value))}
                            className="border-[#D4BBA6] bg-white"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-[#4A3728] text-xs">Presenter</Label>
                          <Select
                            value={item.presenter_id || 'none'}
                            onValueChange={(v) => updateAgendaItem(index, 'presenter_id', v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className="border-[#D4BBA6] bg-white">
                              <SelectValue placeholder="Select presenter" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#D4BBA6]">
                              <SelectItem value="none">No presenter</SelectItem>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.first_name} {user.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#6B5D52]">
                  <FileText className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                  <p>No agenda items yet. Click "Add Item" to create one.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="mt-6">
          <Card className="bg-white border-[#E8D5C4] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#4A3728] text-base">Meeting Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label className="text-[#4A3728]">Add Participant</Label>
                <Select onValueChange={addParticipant}>
                  <SelectTrigger className="border-[#D4BBA6]">
                    <Users className="w-4 h-4 mr-2 text-[#6B5D52]" />
                    <SelectValue placeholder="Select user to add" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    {users
                      .filter(u => !participants.find(p => p.user_id === u.id))
                      .map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map(p => (
                    <div key={p.user_id} className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#4A3728] text-white flex items-center justify-center text-sm font-medium">
                          {p.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#4A3728]">{p.name}</p>
                          <p className="text-xs text-[#6B5D52]">{p.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white capitalize">{p.role}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(p.user_id)}
                          className="text-red-600 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#6B5D52]">
                  <Users className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                  <p>No participants added yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="mt-6">
          <Card className="bg-white border-[#E8D5C4] shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[#4A3728] text-base">Pre-Read Documents</CardTitle>
              <Button size="sm" variant="outline" onClick={addPreReadDocument} className="border-[#D4BBA6]">
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </CardHeader>
            <CardContent>
              {preReadDocuments.length > 0 ? (
                <div className="space-y-4">
                  {preReadDocuments.map((doc, index) => (
                    <div key={index} className="p-4 bg-[#F5EBE0] rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className="bg-white">Document {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePreReadDocument(index)}
                          className="text-red-600 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[#4A3728] text-xs">Title</Label>
                          <Input
                            value={doc.title}
                            onChange={(e) => updatePreReadDocument(index, 'title', e.target.value)}
                            placeholder="Document title"
                            className="border-[#D4BBA6] bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-[#4A3728] text-xs">Type</Label>
                          <Select
                            value={doc.file_type}
                            onValueChange={(v) => updatePreReadDocument(index, 'file_type', v)}
                          >
                            <SelectTrigger className="border-[#D4BBA6] bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#D4BBA6]">
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="file">File</SelectItem>
                              <SelectItem value="dashboard">Dashboard</SelectItem>
                              <SelectItem value="report">Report</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-[#4A3728] text-xs">URL</Label>
                          <Input
                            value={doc.url}
                            onChange={(e) => updatePreReadDocument(index, 'url', e.target.value)}
                            placeholder="https://..."
                            className="border-[#D4BBA6] bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#6B5D52]">
                  <FileText className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                  <p>No pre-read documents yet. Click "Add Document" to attach resources.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreateMeeting;
