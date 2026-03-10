import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, FolderKanban, Calendar, Users, Flag,
  MoreVertical, Edit, Trash2, Eye, RefreshCw, ChevronDown,
  CheckCircle2, Clock, AlertTriangle, Folder, ArrowRight, ListTodo,
  Lock, Globe, UserPlus, UserMinus, Paperclip, Upload, X, File, Target,
  LayoutGrid, List, FileText, ChevronRight, CalendarPlus
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RichTextEditor } from '../../components/ui/rich-text-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', color: 'bg-stone-100 text-stone-600 border-stone-200' }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-stone-100 text-stone-600', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: Trash2 }
};

const ProjectCard = ({ project, onEdit, onDelete, onView, onScheduleMeeting }) => {
  const navigate = useNavigate();
  const StatusIcon = statusConfig[project.status]?.icon || Clock;
  
  const progressColor = project.progress >= 75 ? 'bg-emerald-500' : 
                        project.progress >= 50 ? 'bg-blue-500' : 
                        project.progress >= 25 ? 'bg-amber-500' : 'bg-stone-400';

  const isPrivate = project.visibility === 'private';

  return (
    <Card 
      className="bg-white border-[#E8D5C4] hover:border-[#D4BBA6] transition-all cursor-pointer group shadow-sm hover:shadow-md"
      onClick={() => navigate(`/projects/${project.id}`)}
      data-testid={`project-card-${project.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {project.project_id && (
              <Badge variant="secondary" className="bg-[#E8D5C4] text-[#4A3728] text-xs font-mono">
                {project.project_id}
              </Badge>
            )}
            {isPrivate && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </Badge>
            )}
            <Badge variant="outline" className={priorityConfig[project.priority]?.color}>
              <Flag className="w-3 h-3 mr-1" />
              {project.priority}
            </Badge>
            <Badge variant="outline" className={statusConfig[project.status]?.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[project.status]?.label}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4 text-[#5D4A3A]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(project); }} className="text-[#4A3728] cursor-pointer">
                <Eye className="w-4 h-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onScheduleMeeting(project); }} className="text-[#4A3728] cursor-pointer">
                <CalendarPlus className="w-4 h-4 mr-2" /> Schedule Meeting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-[#4A3728] cursor-pointer">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                className="text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-[#4A3728] text-lg mb-1">{project.name}</h3>
        
        {project.module_name && (
          <p className="text-sm text-[#5D4A3A] flex items-center gap-1 mb-2">
            <Folder className="w-3.5 h-3.5" />
            {project.module_name}
          </p>
        )}

        {/* Linked Objective Badge */}
        {project.linked_objective_title && (
          <div className="mb-3">
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              <Target className="w-3 h-3 mr-1" />
              {project.linked_objective_title}
            </Badge>
          </div>
        )}

        {project.description && (
          <p className="text-sm text-[#5D4A3A] line-clamp-2 mb-4">{project.description}</p>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#5D4A3A]">Progress</span>
            <span className="text-[#4A3728] font-medium">{project.progress}%</span>
          </div>
          <div className="h-2 bg-[#E8D5C4] rounded-full overflow-hidden">
            <div 
              className={`h-full ${progressColor} transition-all`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-[#5D4A3A]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {project.completed_task_count}/{project.task_count} tasks
            </span>
            {project.team_members?.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {project.team_members.length}
              </span>
            )}
          </div>
          {project.end_date && (
            <span className="text-[#5D4A3A] flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Project List View (Table format)
const ProjectListView = ({ projects, onEdit, onDelete, onView, onScheduleMeeting }) => {
  const navigate = useNavigate();
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white border border-[#E8D5C4] rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-[#F5EBE0] border-b border-[#E8D5C4]">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#4A3728]">Project</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#4A3728]">Status</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#4A3728]">Priority</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#4A3728]">Progress</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#4A3728]">Tasks</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-[#4A3728]">Due Date</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-[#4A3728]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, idx) => {
            const StatusIcon = statusConfig[project.status]?.icon || Clock;
            return (
              <tr 
                key={project.id} 
                className={`border-b border-[#E8D5C4] hover:bg-[#FDF8F3] cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                onClick={() => navigate(`/projects/${project.id}`)}
                data-testid={`project-row-${project.id}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#4A3728] truncate">{project.name}</span>
                        {project.project_id && (
                          <Badge variant="secondary" className="bg-[#E8D5C4] text-[#4A3728] text-xs font-mono flex-shrink-0">
                            {project.project_id}
                          </Badge>
                        )}
                        {project.visibility === 'private' && (
                          <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        )}
                      </div>
                      {project.linked_objective_title && (
                        <div className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5">
                          <Target className="w-3 h-3" />
                          {project.linked_objective_title}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`${statusConfig[project.status]?.color} whitespace-nowrap`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[project.status]?.label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`${priorityConfig[project.priority]?.color} whitespace-nowrap`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {project.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress value={project.progress || 0} className="h-2 flex-1" />
                    <span className="text-sm text-[#4A3728] font-medium w-10 text-right">{project.progress || 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[#5D4A3A] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {project.completed_task_count}/{project.task_count}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-[#5D4A3A]">{formatDate(project.end_date)}</span>
                </td>
                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4 text-[#5D4A3A]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
                      <DropdownMenuItem onClick={() => onView(project)} className="text-[#4A3728] cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onScheduleMeeting && onScheduleMeeting(project)} className="text-[#4A3728] cursor-pointer">
                        <CalendarPlus className="w-4 h-4 mr-2" /> Schedule Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(project)} className="text-[#4A3728] cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(project)} className="text-red-600 cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const CreateProjectModal = ({ open, onClose, modules, departments, users, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [objectives, setObjectives] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    description: '',
    priority: 'medium',
    visibility: 'public',
    status: 'draft',
    project_manager_id: '',
    start_date: '',
    end_date: '',
    linked_objective_id: ''
  });

  const projectStatuses = [
    { value: 'draft', label: 'Draft', color: 'bg-stone-100 text-stone-700' },
    { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'on_hold', label: 'On Hold', color: 'bg-amber-100 text-amber-700' }
  ];

  // Fetch objectives for dropdown
  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        const token = localStorage.getItem('sevora_token');
        const res = await fetch(`${API}/api/projects/objectives-list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setObjectives(data);
        }
      } catch (e) {
        console.error('Error fetching objectives:', e);
      }
    };
    if (open) {
      fetchObjectives();
      setActiveTab('details');
      setTeamMembers([]);
      setFormData({
        name: '', department_id: '', description: '', priority: 'medium',
        visibility: 'public', status: 'draft', project_manager_id: '',
        start_date: '', end_date: '', linked_objective_id: ''
      });
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name) {
      toast.error('Project name is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const payload = { ...formData, team_members: teamMembers };
      if (!payload.department_id) delete payload.department_id;
      if (!payload.project_manager_id) delete payload.project_manager_id;
      if (!payload.linked_objective_id) delete payload.linked_objective_id;
      
      const response = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create project');
      
      toast.success('Project created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    if (!selectedMember || teamMembers.includes(selectedMember)) return;
    setTeamMembers([...teamMembers, selectedMember]);
    setSelectedMember('');
  };

  const handleRemoveMember = (memberId) => {
    setTeamMembers(teamMembers.filter(id => id !== memberId));
  };

  const getMemberName = (memberId) => {
    const user = users.find(u => u.id === memberId);
    return user ? user.name : memberId;
  };

  const availableUsers = users.filter(u => !teamMembers.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#D4BBA6] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#4A3728] flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-rose-600" />
            Create New Project
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#F5EBE0]">
            <TabsTrigger value="details" className="data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" />Details
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-white">
              <Users className="w-4 h-4 mr-2" />Team
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              <div>
                <Label className="text-[#4A3728]">Project Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                  className="border-[#D4BBA6] focus:border-rose-500 mt-1"
                  data-testid="project-name-input"
                />
              </div>

              <div>
                <Label className="text-[#4A3728]">Description</Label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Brief project description..."
                  minHeight="100px"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Department</Label>
                  <Select
                    value={formData.department_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="border-[#D4BBA6] mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="none">None</SelectItem>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="border-[#D4BBA6] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      {projectStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className={`px-2 py-0.5 rounded text-sm ${status.color}`}>{status.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Visibility</Label>
                  <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
                    <SelectTrigger className="border-[#D4BBA6] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-600" />Public</span></SelectItem>
                      <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-600" />Private</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[#4A3728]">Project Manager</Label>
                <Select
                  value={formData.project_manager_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, project_manager_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger className="border-[#D4BBA6] mt-1">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                    <SelectItem value="none">No PM assigned</SelectItem>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="border-[#D4BBA6] mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="border-[#D4BBA6] mt-1"
                  />
                </div>
              </div>

              {/* Linked Objective */}
              <div>
                <Label className="text-[#4A3728]">Linked Objective (Goals & Objectives)</Label>
                <Select
                  value={formData.linked_objective_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, linked_objective_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger className="border-[#D4BBA6] mt-1">
                    <SelectValue placeholder="Link to an objective..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                    <SelectItem value="none">No linked objective</SelectItem>
                    {objectives.map(obj => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.title} ({obj.quarter_name} - {obj.fiscal_year_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#9C8C74] mt-1">Link this project to a company objective.</p>
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="border-[#D4BBA6] flex-1">
                    <SelectValue placeholder="Select user to add" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddMember} disabled={!selectedMember} className="bg-rose-600 hover:bg-rose-700 text-white">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-[#D4BBA6] rounded-lg">
                    <Users className="w-10 h-10 mx-auto text-[#9C8C74] mb-2" />
                    <p className="text-[#9C8C74] text-sm">No team members added yet</p>
                    <p className="text-[#9C8C74] text-xs">Add team members to collaborate on this project</p>
                  </div>
                ) : (
                  teamMembers.map(memberId => {
                    const member = users.find(u => u.id === memberId);
                    return (
                      <div key={memberId} className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-medium">
                            {getMemberName(memberId).charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-[#4A3728]">{getMemberName(memberId)}</p>
                            {member && <p className="text-xs text-[#6B5D52]">{member.email}</p>}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMember(memberId)} className="text-red-600 hover:bg-red-50">
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#E8D5C4] mt-4">
          <Button type="button" variant="outline" onClick={onClose} className="border-[#D4BBA6] text-[#4A3728]">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white">
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


// Edit Project Modal with Tabs
const EditProjectModal = ({ open, onClose, project, modules, departments, users, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    description: '',
    priority: 'medium',
    visibility: 'public',
    status: 'draft',
    project_manager_id: '',
    start_date: '',
    end_date: '',
    linked_objective_id: ''
  });

  // Fetch objectives for dropdown
  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        const token = localStorage.getItem('sevora_token');
        const res = await fetch(`${API}/api/projects/objectives-list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setObjectives(data);
        }
      } catch (e) {
        console.error('Error fetching objectives:', e);
      }
    };
    if (open) fetchObjectives();
  }, [open]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        department_id: project.department_id || '',
        description: project.description || '',
        priority: project.priority || 'medium',
        visibility: project.visibility || 'public',
        status: project.status || 'draft',
        project_manager_id: project.project_manager_id || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        linked_objective_id: project.linked_objective_id || ''
      });
      setTeamMembers(project.team_members || []);
      fetchAttachments();
    }
  }, [project]);

  const fetchAttachments = async () => {
    if (!project?.id) return;
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/${project.id}/attachments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (e) {
      console.error('Error fetching attachments:', e);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const payload = { ...formData };
      if (!payload.department_id) delete payload.department_id;
      if (!payload.project_manager_id) delete payload.project_manager_id;
      
      const response = await fetch(`${API}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to update project');
      
      toast.success('Project updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMember || teamMembers.includes(selectedMember)) return;
    
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedMember })
      });
      
      if (res.ok) {
        setTeamMembers([...teamMembers, selectedMember]);
        setSelectedMember('');
        toast.success('Team member added');
        onSuccess();
      }
    } catch (e) {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/projects/${project.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setTeamMembers(teamMembers.filter(id => id !== memberId));
        toast.success('Team member removed');
        onSuccess();
      }
    } catch (e) {
      toast.error('Failed to remove member');
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    setUploading(true);
    const token = localStorage.getItem('sevora_token');
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`${API}/api/projects/${project.id}/attachments`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (res.ok) {
          toast.success(`Uploaded ${file.name}`);
        }
      } catch (e) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setUploading(false);
    fetchAttachments();
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      const token = localStorage.getItem('sevora_token');
      await fetch(`${API}/api/projects/${project.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Attachment deleted');
      fetchAttachments();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const getMemberName = (memberId) => {
    const user = users.find(u => u.id === memberId);
    return user ? user.name : memberId;
  };

  const projectStatuses = [
    { value: 'draft', label: 'Draft', color: 'bg-stone-100 text-stone-700' },
    { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'on_hold', label: 'On Hold', color: 'bg-amber-100 text-amber-700' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' }
  ];

  const availableUsers = users.filter(u => !teamMembers.includes(u.id));

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#D4BBA6] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[#4A3728] flex items-center gap-2">
            <Edit className="w-5 h-5 text-rose-600" />
            Edit Project: {project.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-[#F5EBE0] p-1 rounded-lg">
            <TabsTrigger value="details" className="data-[state=active]:bg-white">Details</TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-white">
              Team ({teamMembers.length})
            </TabsTrigger>
            <TabsTrigger value="attachments" className="data-[state=active]:bg-white">
              Files ({attachments.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              <div>
                <Label className="text-[#4A3728]">Project Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                  className="border-[#D4BBA6] focus:border-rose-500 mt-1"
                />
              </div>

              <div>
                <Label className="text-[#4A3728]">Description</Label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Project description..."
                  minHeight="100px"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Department</Label>
                  <Select
                    value={formData.department_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="border-[#D4BBA6] mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="none">None</SelectItem>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="border-[#D4BBA6] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="border-[#D4BBA6] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      {projectStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className={`px-2 py-0.5 rounded text-sm ${status.color}`}>{status.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Visibility</Label>
                  <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
                    <SelectTrigger className="border-[#D4BBA6] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                      <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-600" />Public</span></SelectItem>
                      <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-600" />Private</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[#4A3728]">Project Manager</Label>
                <Select value={formData.project_manager_id || 'none'} onValueChange={(value) => setFormData({ ...formData, project_manager_id: value === 'none' ? '' : value })}>
                  <SelectTrigger className="border-[#D4BBA6] mt-1"><SelectValue placeholder="Select PM" /></SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                    <SelectItem value="none">No PM assigned</SelectItem>
                    {users.map(user => (<SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="border-[#D4BBA6] mt-1" />
                </div>
                <div>
                  <Label className="text-[#4A3728]">End Date</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="border-[#D4BBA6] mt-1" />
                </div>
              </div>

              {/* Linked Objective */}
              <div>
                <Label className="text-[#4A3728]">Linked Objective (Goals & Objectives)</Label>
                <Select
                  value={formData.linked_objective_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, linked_objective_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger className="border-[#D4BBA6] mt-1">
                    <SelectValue placeholder="Link to an objective..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                    <SelectItem value="none">No linked objective</SelectItem>
                    {objectives.map(obj => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.title} ({obj.quarter_name} - {obj.fiscal_year_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#9C8C74] mt-1">Link this project to a company objective. Project progress will contribute to objective completion.</p>
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="border-[#D4BBA6] flex-1">
                    <SelectValue placeholder="Select user to add" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddMember} disabled={!selectedMember} className="bg-rose-600 hover:bg-rose-700 text-white">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {teamMembers.length === 0 ? (
                  <p className="text-[#9C8C74] text-sm text-center py-4">No team members yet</p>
                ) : (
                  teamMembers.map(memberId => {
                    const member = users.find(u => u.id === memberId);
                    return (
                      <div key={memberId} className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-medium">
                            {getMemberName(memberId).charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-[#4A3728]">{getMemberName(memberId)}</p>
                            {member && <p className="text-xs text-[#6B5D52]">{member.email}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(memberId)} className="text-red-600 hover:bg-red-50">
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 space-y-4">
              <div className="border-2 border-dashed border-[#D4BBA6] rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="project-file-upload"
                />
                <label htmlFor="project-file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-[#9C8C74] mb-2" />
                  <p className="text-[#6B5D52]">
                    {uploading ? 'Uploading...' : 'Click to upload or drag files here'}
                  </p>
                </label>
              </div>

              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <p className="text-[#9C8C74] text-sm text-center py-4">No attachments yet</p>
                ) : (
                  attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 bg-[#F5EBE0] rounded-lg">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-[#6B5D52]" />
                        <div>
                          <p className="font-medium text-[#4A3728] text-sm">{att.filename}</p>
                          <p className="text-xs text-[#6B5D52]">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:text-rose-700">
                          <Eye className="w-4 h-4" />
                        </a>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAttachment(att.id)} className="text-red-600 hover:bg-red-50">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#E8D5C4] mt-4">
          <Button type="button" variant="outline" onClick={onClose} className="border-[#D4BBA6] text-[#4A3728]">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ProjectsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    module_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [projectsRes, modulesRes, deptsRes, usersRes] = await Promise.all([
        fetch(`${API}/api/projects/list`, { headers }),
        fetch(`${API}/api/projects/modules`, { headers }),
        fetch(`${API}/api/workos/departments`, { headers }),
        fetch(`${API}/api/workos/users`, { headers })
      ]);

      if (!projectsRes.ok || !modulesRes.ok) throw new Error('Failed to fetch data');

      const [projectsData, modulesData] = await Promise.all([
        projectsRes.json(),
        modulesRes.json()
      ]);
      
      const deptsData = deptsRes.ok ? await deptsRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

      setProjects(projectsData);
      setModules(modulesData);
      setDepartments(deptsData);
      setUsers(usersData.users || usersData || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? This will also delete all tasks.`)) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const response = await fetch(`${API}/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Project deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && project.status !== filters.status) return false;
    if (filters.priority && project.priority !== filters.priority) return false;
    if (filters.module_id && project.module_id !== filters.module_id) return false;
    return true;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    onHold: projects.filter(p => p.status === 'on_hold').length
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8" data-testid="projects-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]" data-testid="projects-title">Projects</h1>
          <p className="text-[#5D4A3A] mt-1">Manage all your projects</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/projects/my-tasks')}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
          >
            <ListTodo className="w-4 h-4 mr-2" />
            My Tasks
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData}
            className="border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white"
            data-testid="create-project-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Total Projects</p>
                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Active</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">Completed</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#5D4A3A] text-sm">On Hold</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.onHold}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#FDF8F3] border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search projects..."
                  className="border-[#D4BBA6] pl-10 bg-white"
                  data-testid="search-input"
                />
              </div>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-[150px] border-[#D4BBA6] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilters({ ...filters, priority: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-[150px] border-[#D4BBA6] bg-white">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.module_id}
              onValueChange={(value) => setFilters({ ...filters, module_id: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-[180px] border-[#D4BBA6] bg-white">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4BBA6]">
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* View Toggle */}
            <div className="flex border border-[#D4BBA6] rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded-none px-3 ${viewMode === 'grid' ? 'bg-rose-100 text-rose-700' : 'text-[#5D4A3A] hover:bg-[#F5EBE0]'}`}
                data-testid="view-grid-btn"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-none px-3 ${viewMode === 'list' ? 'bg-rose-100 text-rose-700' : 'text-[#5D4A3A] hover:bg-[#F5EBE0]'}`}
                data-testid="view-list-btn"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid/List */}
      {filteredProjects.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditingProject(p)}
                onDelete={handleDelete}
                onView={(p) => navigate(`/projects/${p.id}`)}
                onScheduleMeeting={(p) => navigate(`/meetings/new?project_id=${p.id}&type=project_review`)}
              />
            ))}
          </div>
        ) : (
          <ProjectListView
            projects={filteredProjects}
            onEdit={(p) => setEditingProject(p)}
            onDelete={handleDelete}
            onView={(p) => navigate(`/projects/${p.id}`)}
            onScheduleMeeting={(p) => navigate(`/meetings/new?project_id=${p.id}&type=project_review`)}
          />
        )
      ) : (
        <Card className="bg-[#FDF8F3] border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <FolderKanban className="w-16 h-16 mx-auto text-[#D4BBA6] mb-4" />
            <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No projects found</h3>
            <p className="text-[#5D4A3A] mb-4">
              {filters.search || filters.status || filters.priority || filters.module_id
                ? 'Try adjusting your filters'
                : 'Create your first project to get started'}
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        modules={modules}
        departments={departments}
        users={users}
        onSuccess={fetchData}
      />

      <EditProjectModal
        open={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        modules={modules}
        departments={departments}
        users={users}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ProjectsList;
