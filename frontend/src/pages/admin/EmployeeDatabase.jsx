import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { 
  Users, Award, Building2, ChevronRight, Plus, Edit2, Trash2,
  Loader2, RefreshCw, Search, UserPlus, Mail, Phone, Calendar, Briefcase, 
  MapPin, Filter, TrendingUp, UserCheck, Shield, ChevronDown, Check, X, 
  AlertTriangle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';

const EmployeeDatabase = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [positions, setPositions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [roles, setRoles] = useState([]);
  const [draftUsers, setDraftUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [onboardingSearch, setOnboardingSearch] = useState('');
  const [filters, setFilters] = useState({
    department_id: '',
    grade_id: '',
    status: '',
  });
  const [stats, setStats] = useState(null);
  
  // Modal states
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [terminatingEmployee, setTerminatingEmployee] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Edit employee form
  const [editForm, setEditForm] = useState({
    status: '',
    employment_type: '',
    department_id: '',
    grade_id: '',
    reports_to: '',
    designation: '',
    work_mode: '',
  });

  // Onboarding form - now with multi-role support
  const [onboardForm, setOnboardForm] = useState({
    department_id: '',
    team_id: '',
    position_id: '',
    grade_id: '',
    reports_to: '',
    custom_role_ids: [], // Changed from custom_role_id to custom_role_ids array
    designation: '',
    employment_type: 'full_time',
    work_mode: 'office',
    joining_date: new Date().toISOString().split('T')[0],
    phone: '',
  });

  useEffect(() => {
    fetchLookupData();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'employees') {
      fetchEmployees();
    } else if (activeTab === 'onboarding') {
      fetchDraftUsers();
    }
  }, [activeTab, filters]);

  // Populate edit form when editing employee changes
  useEffect(() => {
    if (editingEmployee) {
      setEditForm({
        status: editingEmployee.status || 'active',
        employment_type: editingEmployee.employment_type || 'full_time',
        department_id: editingEmployee.department_id || '',
        grade_id: editingEmployee.grade_id || '',
        reports_to: editingEmployee.reports_to || '',
        designation: editingEmployee.designation || '',
        work_mode: editingEmployee.work_mode || 'office',
      });
    }
  }, [editingEmployee]);

  const fetchLookupData = async () => {
    try {
      const [deptRes, teamRes, posRes, gradeRes, roleRes] = await Promise.all([
        api.get('/workos/departments'),
        api.get('/hr/teams'),
        api.get('/hr/positions'),
        api.get('/hr/grades'),
        api.get('/access/roles'),
      ]);
      setDepartments(deptRes.data || []);
      setTeams(teamRes.data || []);
      setPositions(posRes.data || []);
      setGrades(gradeRes.data || []);
      setRoles(roleRes.data || []);
    } catch (err) {
      console.error('Failed to fetch lookup data:', err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [overviewRes, deptRes] = await Promise.all([
        api.get('/hr/v2/stats/overview'),
        api.get('/hr/v2/stats/by-department'),
      ]);
      setStats({
        overview: overviewRes.data,
        byDepartment: deptRes.data,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.grade_id) params.append('grade_id', filters.grade_id);
      if (filters.status) params.append('status', filters.status);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await api.get(`/hr/v2/employees?${params.toString()}`);
      setEmployees(res.data || []);
    } catch (err) {
      toast.error('Failed to load employees');
    }
    setLoading(false);
  };

  const fetchDraftUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/access/draft-users';
      if (onboardingSearch) url += `?search=${encodeURIComponent(onboardingSearch)}`;
      const response = await api.get(url);
      setDraftUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch draft users:', error);
    }
    setLoading(false);
  }, [onboardingSearch]);

  // Search debounce for onboarding
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'onboarding') {
        fetchDraftUsers();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [onboardingSearch, activeTab, fetchDraftUsers]);

  // Onboard user - updated for multi-role
  const handleOnboard = async () => {
    if (!selectedUser || !onboardForm.department_id || onboardForm.custom_role_ids.length === 0) {
      toast.error('Department and at least one Access Role are required');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...onboardForm,
        team_id: onboardForm.team_id || null,
        position_id: onboardForm.position_id || null,
        grade_id: onboardForm.grade_id || null,
        reports_to: onboardForm.reports_to || null,
      };
      
      const response = await api.post(`/access/onboard/${selectedUser.id}`, payload);
      toast.success(response.data?.message || 'Employee onboarded successfully');
      setShowOnboardModal(false);
      setSelectedUser(null);
      resetOnboardForm();
      fetchDraftUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to onboard employee');
    }
    setSaving(false);
  };

  const resetOnboardForm = () => {
    setOnboardForm({
      department_id: '',
      team_id: '',
      position_id: '',
      grade_id: '',
      reports_to: '',
      custom_role_ids: [], // Multi-role support
      designation: '',
      employment_type: 'full_time',
      work_mode: 'office',
      joining_date: new Date().toISOString().split('T')[0],
      phone: '',
    });
  };

  // Save employee changes
  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;
    
    setSaving(true);
    try {
      await api.put(`/hr/v2/employees/${editingEmployee.id}`, editForm);
      toast.success('Employee updated successfully');
      setShowEmployeeModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update employee');
    }
    setSaving(false);
  };

  // Terminate employee
  const handleTerminateEmployee = async () => {
    if (!terminatingEmployee) return;
    
    setSaving(true);
    try {
      await api.delete(`/hr/v2/employees/${terminatingEmployee.id}`);
      toast.success('Employee terminated successfully');
      setShowTerminateDialog(false);
      setTerminatingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to terminate employee');
    }
    setSaving(false);
  };

  const openTerminateDialog = (emp) => {
    setTerminatingEmployee(emp);
    setShowTerminateDialog(true);
  };

  const openOnboardModal = (user) => {
    setSelectedUser(user);
    resetOnboardForm();
    setShowOnboardModal(true);
  };

  const filteredTeams = teams.filter(t => !onboardForm.department_id || t.department_id === onboardForm.department_id);

  const tabs = [
    { id: 'overview', label: 'Employee Overview', icon: TrendingUp },
    { id: 'employees', label: 'All Employees', icon: Users, count: employees.length },
    { id: 'onboarding', label: 'Employee Onboarding', icon: UserPlus, count: draftUsers.length },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="employee-database">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
        <Building2 className="w-4 h-4" />
        <span>HR</span>
        <ChevronRight className="w-4 h-4" />
        <span>Employee Database</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Employee Database</h1>
          <p className="text-[#5D4A3A] text-sm mt-1">Central HR employee management and onboarding</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#F5EDE4] p-1">
          {tabs.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid={`tab-${tab.id}`}
              data-tour={`${tab.id}-tab`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 bg-[#8B7355]/10">
                  {tab.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewTab stats={stats} loading={loading} departments={departments} />
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <EmployeesTab 
            employees={employees}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={filters}
            setFilters={setFilters}
            departments={departments}
            grades={grades}
            onRefresh={fetchEmployees}
            onEditEmployee={(emp) => {
              setEditingEmployee(emp);
              setShowEmployeeModal(true);
            }}
            onTerminateEmployee={openTerminateDialog}
          />
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding">
          <OnboardingTab 
            draftUsers={draftUsers}
            loading={loading}
            searchQuery={onboardingSearch}
            setSearchQuery={setOnboardingSearch}
            onOnboard={openOnboardModal}
            onRefresh={fetchDraftUsers}
            departments={departments}
            grades={grades}
            roles={roles}
          />
        </TabsContent>
      </Tabs>

      {/* Onboard Modal */}
      <Dialog open={showOnboardModal} onOpenChange={setShowOnboardModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Onboard Employee</DialogTitle>
            <DialogDescription>
              Complete the employee profile for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <Card className="border-[#E8D5C4]">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                    <span className="text-[#4A3728] font-bold text-lg">
                      {selectedUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#4A3728]">{selectedUser?.name}</p>
                    <p className="text-sm text-[#5D4A3A]">{selectedUser?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization */}
            <div>
              <h4 className="font-medium text-[#4A3728] mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Department *</Label>
                  <Select 
                    value={onboardForm.department_id} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, department_id: v, team_id: '' })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Team</Label>
                  <Select 
                    value={onboardForm.team_id || "none"} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, team_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {filteredTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Position</Label>
                  <Select 
                    value={onboardForm.position_id || "none"} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, position_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {positions.map(pos => (
                        <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Grade</Label>
                  <Select 
                    value={onboardForm.grade_id || "none"} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, grade_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {grades.map(grade => (
                        <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Employment */}
            <div>
              <h4 className="font-medium text-[#4A3728] mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Employment Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Designation</Label>
                  <Input
                    value={onboardForm.designation}
                    onChange={(e) => setOnboardForm({ ...onboardForm, designation: e.target.value })}
                    placeholder="e.g., Senior Developer"
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">Joining Date</Label>
                  <Input
                    type="date"
                    value={onboardForm.joining_date}
                    onChange={(e) => setOnboardForm({ ...onboardForm, joining_date: e.target.value })}
                    className="border-[#E8D5C4]"
                  />
                </div>
                <div>
                  <Label className="text-[#4A3728]">Employment Type</Label>
                  <Select 
                    value={onboardForm.employment_type} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, employment_type: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Work Mode</Label>
                  <Select 
                    value={onboardForm.work_mode} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, work_mode: v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Phone</Label>
                  <Input
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="border-[#E8D5C4]"
                  />
                </div>
              </div>
            </div>

            {/* Reporting & Access - Multi-role */}
            <div>
              <h4 className="font-medium text-[#4A3728] mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Reporting & Access
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#4A3728]">Reports To</Label>
                  <Select 
                    value={onboardForm.reports_to || "none"} 
                    onValueChange={(v) => setOnboardForm({ ...onboardForm, reports_to: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="border-[#E8D5C4]">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#4A3728]">Access Roles * (Multi-select)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between border-[#E8D5C4] h-10 font-normal"
                        data-testid="role-multi-select-trigger"
                      >
                        {onboardForm.custom_role_ids.length === 0 ? (
                          <span className="text-muted-foreground">Select roles...</span>
                        ) : (
                          <span className="truncate">
                            {onboardForm.custom_role_ids.length} role{onboardForm.custom_role_ids.length > 1 ? 's' : ''} selected
                          </span>
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 z-[100]" align="start">
                      <div className="p-2 border-b">
                        <p className="text-sm text-[#5D4A3A]">Select one or more access roles</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {roles.map(role => {
                          const isSelected = onboardForm.custom_role_ids.includes(role.id);
                          return (
                            <div 
                              key={role.id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-[#F5EDE5] ${isSelected ? 'bg-[#E8D5C4]/50' : ''}`}
                              onClick={() => {
                                const newIds = isSelected
                                  ? onboardForm.custom_role_ids.filter(id => id !== role.id)
                                  : [...onboardForm.custom_role_ids, role.id];
                                setOnboardForm({ ...onboardForm, custom_role_ids: newIds });
                              }}
                              data-testid={`role-option-${role.id}`}
                            >
                              <Checkbox 
                                checked={isSelected}
                                className="border-[#8B7355] data-[state=checked]:bg-[#4A3728] data-[state=checked]:border-[#4A3728]"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-[#4A3728] text-sm">{role.name}</p>
                                {role.description && (
                                  <p className="text-xs text-[#5D4A3A] truncate">{role.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {onboardForm.custom_role_ids.length > 0 && (
                        <div className="p-2 border-t bg-[#F5EDE5]">
                          <div className="flex flex-wrap gap-1">
                            {onboardForm.custom_role_ids.map(roleId => {
                              const role = roles.find(r => r.id === roleId);
                              return role ? (
                                <Badge 
                                  key={roleId} 
                                  variant="secondary" 
                                  className="bg-[#4A3728] text-white text-xs"
                                >
                                  {role.name}
                                  <X 
                                    className="h-3 w-3 ml-1 cursor-pointer hover:text-red-300" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOnboardForm({
                                        ...onboardForm,
                                        custom_role_ids: onboardForm.custom_role_ids.filter(id => id !== roleId)
                                      });
                                    }}
                                  />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {/* Selected roles display */}
              {onboardForm.custom_role_ids.length > 0 && (
                <div className="mt-3 p-3 bg-[#F5EDE5] rounded-lg">
                  <p className="text-xs text-[#5D4A3A] mb-2">Selected Roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {onboardForm.custom_role_ids.map(roleId => {
                      const role = roles.find(r => r.id === roleId);
                      return role ? (
                        <Badge key={roleId} className="bg-[#4A3728] text-white">
                          {role.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardModal(false)} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button
              onClick={handleOnboard}
              disabled={saving || !onboardForm.department_id || onboardForm.custom_role_ids.length === 0}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
              data-testid="complete-onboarding-btn"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Complete Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={showEmployeeModal} onOpenChange={(open) => { setShowEmployeeModal(open); if(!open) setEditingEmployee(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee details for {editingEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Employee Info (Read-only) */}
            <div className="bg-[#F5EDE5] p-3 rounded-lg">
              <p className="text-sm text-[#5D4A3A]">Employee</p>
              <p className="font-medium text-[#4A3728]">{editingEmployee?.name}</p>
              <p className="text-sm text-[#5D4A3A]">{editingEmployee?.email}</p>
              <p className="text-xs text-[#8B7355] mt-1">ID: {editingEmployee?.employee_code}</p>
            </div>

            {/* Status */}
            <div>
              <Label className="text-[#4A3728]">Employee Status *</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="notice_period">Notice Period</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employment Type */}
            <div>
              <Label className="text-[#4A3728]">Employment Type</Label>
              <Select value={editForm.employment_type} onValueChange={(v) => setEditForm({ ...editForm, employment_type: v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div>
              <Label className="text-[#4A3728]">Department</Label>
              <Select value={editForm.department_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, department_id: v === "none" ? "" : v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade */}
            <div>
              <Label className="text-[#4A3728]">Grade</Label>
              <Select value={editForm.grade_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, grade_id: v === "none" ? "" : v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grade</SelectItem>
                  {grades.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reporting Manager */}
            <div>
              <Label className="text-[#4A3728]">Reporting Manager</Label>
              <Select value={editForm.reports_to || "none"} onValueChange={(v) => setEditForm({ ...editForm, reports_to: v === "none" ? "" : v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {employees.filter(e => e.id !== editingEmployee?.id).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Designation */}
            <div>
              <Label className="text-[#4A3728]">Designation</Label>
              <Input 
                value={editForm.designation} 
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                placeholder="e.g., Senior Developer"
                className="border-[#E8D5C4]"
              />
            </div>

            {/* Work Mode */}
            <div>
              <Label className="text-[#4A3728]">Work Mode</Label>
              <Select value={editForm.work_mode} onValueChange={(v) => setEditForm({ ...editForm, work_mode: v })}>
                <SelectTrigger className="border-[#E8D5C4]">
                  <SelectValue placeholder="Select work mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmployee}
              disabled={saving}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Employee Confirmation Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Terminate Employee
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate {terminatingEmployee?.name}? 
              This will deactivate their employee record and platform access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action will:
            </p>
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
              <li>Mark employee status as "Terminated"</li>
              <li>Deactivate their platform access</li>
              <li>Record today as exit date</li>
            </ul>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowTerminateDialog(false); setTerminatingEmployee(null); }} 
              className="border-[#E8D5C4]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTerminateEmployee}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Terminate Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats, loading, departments }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  const overview = stats?.overview || {};
  const byDepartment = stats?.byDepartment || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-[#8B7355] mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{overview.total_employees || 0}</p>
            <p className="text-xs text-[#5D4A3A]">Total Employees</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{overview.active_employees || 0}</p>
            <p className="text-xs text-[#5D4A3A]">Active Employees</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Building2 className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{departments.length}</p>
            <p className="text-xs text-[#5D4A3A]">Departments</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-[#4A3728]">{overview.new_hires_this_month || 0}</p>
            <p className="text-xs text-[#5D4A3A]">New This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card className="border-[#E8D5C4]">
        <CardHeader>
          <CardTitle className="text-lg text-[#4A3728]">Employees by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {byDepartment.map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#F5EDE5] rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-[#8B7355]" />
                  <span className="font-medium text-[#4A3728]">{dept.department_name || 'Unknown'}</span>
                </div>
                <Badge variant="secondary" className="bg-[#8B7355]/10 text-[#4A3728]">
                  {dept.count} employees
                </Badge>
              </div>
            ))}
            {byDepartment.length === 0 && (
              <p className="text-center text-[#8B7355] py-4">No department data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Employees Tab Component
const EmployeesTab = ({ employees, loading, searchQuery, setSearchQuery, filters, setFilters, departments, grades, onRefresh, onEditEmployee, onTerminateEmployee }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#E8D5C4]"
          />
        </div>
        <Select 
          value={filters.department_id || "all"} 
          onValueChange={(v) => setFilters({ ...filters, department_id: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-48 border-[#E8D5C4]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select 
          value={filters.status || "all"} 
          onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-36 border-[#E8D5C4]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="probation">Probation</SelectItem>
            <SelectItem value="notice_period">Notice Period</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onRefresh} className="border-[#E8D5C4]">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5EDE5]">
                <TableHead className="text-[#4A3728] whitespace-nowrap">User ID</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Employee ID</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Name</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Email ID</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Department</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Role</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Grade</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Reporting Manager</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Joining Date</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Employment Type</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap">Employee Status</TableHead>
                <TableHead className="text-[#4A3728] whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-[#5D4A3A]">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-[#F5EDE5]">
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {emp.user_id?.slice(0, 8) || '-'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-[#F5EDE5] px-2 py-1 rounded font-medium text-[#4A3728]">
                        {emp.employee_id || emp.employee_code || '-'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#E8D5C4] flex items-center justify-center flex-shrink-0">
                          <span className="text-[#4A3728] font-medium text-sm">
                            {emp.name?.charAt(0)?.toUpperCase() || 'E'}
                          </span>
                        </div>
                        <span className="font-medium text-[#4A3728] whitespace-nowrap">{emp.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#5D4A3A] text-sm">{emp.email || '-'}</TableCell>
                    <TableCell>
                      {emp.department_name ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {emp.department_name}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {emp.custom_role_names?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {emp.custom_role_names.slice(0, 2).map((role, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                          {emp.custom_role_names.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{emp.custom_role_names.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.grade_name ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {emp.grade_name}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-[#5D4A3A] text-sm whitespace-nowrap">
                      {emp.manager_name || emp.reports_to_name || '-'}
                    </TableCell>
                    <TableCell className="text-[#5D4A3A] text-sm whitespace-nowrap">
                      {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {emp.employment_type ? (
                        <Badge className={
                          emp.employment_type === 'full_time' ? 'bg-green-100 text-green-800' :
                          emp.employment_type === 'part_time' ? 'bg-blue-100 text-blue-800' :
                          emp.employment_type === 'contract' ? 'bg-orange-100 text-orange-800' :
                          emp.employment_type === 'intern' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {emp.employment_type.replace('_', ' ')}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        emp.status === 'active' ? 'bg-green-100 text-green-800' :
                        emp.status === 'probation' ? 'bg-yellow-100 text-yellow-800' :
                        emp.status === 'notice_period' ? 'bg-orange-100 text-orange-800' :
                        emp.status === 'resigned' ? 'bg-red-100 text-red-800' :
                        emp.status === 'terminated' ? 'bg-red-100 text-red-800' :
                        emp.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {emp.status?.replace('_', ' ') || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onEditEmployee(emp)}
                          className="border-[#E8D5C4] hover:bg-[#F5EDE5]"
                        >
                          <Edit2 className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        {emp.status !== 'terminated' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onTerminateEmployee(emp)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Onboarding Tab Component
const OnboardingTab = ({ draftUsers, loading, searchQuery, setSearchQuery, onOnboard, onRefresh, departments = [], grades = [], roles = [] }) => {
  const hasDepartments = departments.length > 0;
  const hasGrades = grades.length > 0;
  const hasRoles = roles.length > 0;
  const hasAllPrereqs = hasDepartments && hasRoles;
  
  return (
    <div className="space-y-4">
      {/* Warning Banners for Missing Prerequisites */}
      {!hasAllPrereqs && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 mb-2">Setup Required Before Onboarding</p>
                <div className="space-y-1 text-sm text-amber-700">
                  {!hasDepartments && (
                    <p className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span><strong>Departments</strong> not configured - </span>
                      <a href="/admin/organization" className="underline hover:no-underline">Go to Organization Management →</a>
                    </p>
                  )}
                  {!hasRoles && (
                    <p className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span><strong>Access Roles</strong> not configured - </span>
                      <a href="/admin/access-control" className="underline hover:no-underline">Go to Access Control →</a>
                    </p>
                  )}
                  {!hasGrades && (
                    <p className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span><strong>Grades</strong> not configured (optional) - </span>
                      <a href="/admin/organization" className="underline hover:no-underline">Go to Organization Management →</a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Employee Onboarding:</strong> Link platform users to their HR employee records. 
            Select a user below to complete their employee profile with department, position, grade, and reporting manager.
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7355]" />
          <Input
            placeholder="Search users pending onboarding..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#E8D5C4]"
          />
        </div>
        <Button variant="outline" onClick={onRefresh} className="border-[#E8D5C4]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Users List */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5EDE5]">
                <TableHead className="text-[#4A3728]">User</TableHead>
                <TableHead className="text-[#4A3728]">Source</TableHead>
                <TableHead className="text-[#4A3728]">Status</TableHead>
                <TableHead className="text-[#4A3728]">Created</TableHead>
                <TableHead className="text-[#4A3728] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#8B7355]" />
                  </TableCell>
                </TableRow>
              ) : draftUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#5D4A3A]">
                    No users pending onboarding
                  </TableCell>
                </TableRow>
              ) : (
                draftUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-[#F5EDE5]" data-testid={`draft-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8D5C4] flex items-center justify-center">
                          <span className="text-[#4A3728] font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#4A3728]">{user.name}</p>
                          <p className="text-sm text-[#5D4A3A]">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {user.microsoft_id ? 'Microsoft AD' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending Onboarding
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#5D4A3A] text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => onOnboard(user)}
                        className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
                        size="sm"
                        data-testid={`onboard-btn-${user.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Onboard
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDatabase;
