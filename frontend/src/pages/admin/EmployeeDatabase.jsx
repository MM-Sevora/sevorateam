import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Users, Award, GitBranch, Building2, ChevronRight, Plus, Edit2, Trash2,
  Loader2, RefreshCw, Search, UserPlus, Check, X, MoreVertical, Mail, 
  Phone, Calendar, Briefcase, MapPin, ChevronDown, Filter, Download,
  TrendingUp, Clock, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const EmployeeDatabase = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [grades, setGrades] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    department_id: '',
    grade_id: '',
    status: '',
    employment_type: ''
  });
  const [stats, setStats] = useState(null);
  
  // Modal states
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    } else if (activeTab === 'grades') {
      fetchGrades();
    } else if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab, filters]);

  const fetchInitialData = async () => {
    try {
      const [deptRes, gradeRes] = await Promise.all([
        api.get('/workos/departments'),
        api.get('/hr/grades')
      ]);
      setDepartments(deptRes.data);
      setGrades(gradeRes.data);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.grade_id) params.append('grade_id', filters.grade_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.employment_type) params.append('employment_type', filters.employment_type);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await api.get(`/hr/employees?${params.toString()}`);
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      toast.error('Failed to load employees');
    }
    setLoading(false);
  };

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/grades');
      setGrades(res.data);
    } catch (err) {
      toast.error('Failed to load grades');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [overviewRes, deptRes, gradeRes] = await Promise.all([
        api.get('/hr/stats/overview'),
        api.get('/hr/stats/by-department'),
        api.get('/hr/stats/by-grade')
      ]);
      setStats({
        overview: overviewRes.data,
        byDepartment: deptRes.data,
        byGrade: gradeRes.data
      });
    } catch (err) {
      toast.error('Failed to load stats');
    }
    setLoading(false);
  };

  const seedGrades = async () => {
    try {
      const res = await api.post('/hr/seed-grades');
      toast.success(res.data.message);
      fetchGrades();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to seed grades');
    }
  };

  const handleSearch = () => {
    fetchEmployees();
  };

  const clearFilters = () => {
    setFilters({ department_id: '', grade_id: '', status: '', employment_type: '' });
    setSearchQuery('');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'employees', label: 'Employees', icon: Users, count: employees.length },
    { id: 'grades', label: 'Grade Types', icon: Award, count: grades.length },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="employee-database">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
          <Building2 className="w-4 h-4" />
          <span>HR</span>
          <ChevronRight className="w-4 h-4" />
          <span>Employee Database</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2E22]">Employee Database</h1>
            <p className="text-[#8B7355] mt-1">Manage employees, grades, and reporting structure</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => activeTab === 'employees' ? fetchEmployees() : activeTab === 'grades' ? fetchGrades() : fetchStats()}
              className="p-2 rounded-lg border border-[#E8D5C4] hover:bg-[#F5EDE4] transition-colors"
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-5 h-5 text-[#5D4A3A] ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'employees' && (
              <button
                onClick={() => { setEditingItem(null); setShowEmployeeModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                data-testid="add-employee-btn"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </button>
            )}
            {activeTab === 'grades' && (
              <button
                onClick={() => { setEditingItem(null); setShowGradeModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                data-testid="add-grade-btn"
              >
                <Plus className="w-4 h-4" />
                Add Grade
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F5EDE4] p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-white text-[#3D2E22] shadow-sm' 
                : 'text-[#8B7355] hover:text-[#5D4A3A]'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#8B7355]/10 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <OverviewTab stats={stats} loading={loading} />
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <>
          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
                data-testid="search-input"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                showFilters ? 'bg-[#8B7355] text-white border-[#8B7355]' : 'border-[#E8D5C4] hover:bg-[#F5EDE4]'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </button>
            {Object.values(filters).filter(Boolean).length > 0 && (
              <button onClick={clearFilters} className="text-sm text-[#8B7355] hover:text-[#5D4A3A]">
                Clear all
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-[#F5EDE4] rounded-lg">
              <div>
                <label className="block text-sm font-medium text-[#3D2E22] mb-1">Department</label>
                <select
                  value={filters.department_id}
                  onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg bg-white"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3D2E22] mb-1">Grade</label>
                <select
                  value={filters.grade_id}
                  onChange={(e) => setFilters({ ...filters, grade_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg bg-white"
                >
                  <option value="">All Grades</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3D2E22] mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg bg-white"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="on_notice">On Notice</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3D2E22] mb-1">Employment Type</label>
                <select
                  value={filters.employment_type}
                  onChange={(e) => setFilters({ ...filters, employment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg bg-white"
                >
                  <option value="">All Types</option>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
            </div>
          )}

          {/* Employees Table */}
          <EmployeesTable 
            employees={employees}
            departments={departments}
            grades={grades}
            loading={loading}
            onEdit={(emp) => { setEditingItem(emp); setShowEmployeeModal(true); }}
            onRefresh={fetchEmployees}
          />
        </>
      )}

      {/* Grades Tab */}
      {activeTab === 'grades' && (
        <GradesTab 
          grades={grades}
          loading={loading}
          onEdit={(grade) => { setEditingItem(grade); setShowGradeModal(true); }}
          onRefresh={fetchGrades}
          onSeed={seedGrades}
        />
      )}

      {/* Modals */}
      {showEmployeeModal && (
        <EmployeeModal
          employee={editingItem}
          departments={departments}
          grades={grades}
          allEmployees={employees}
          onClose={() => setShowEmployeeModal(false)}
          onSave={() => { setShowEmployeeModal(false); fetchEmployees(); }}
        />
      )}
      {showGradeModal && (
        <GradeModal
          grade={editingItem}
          onClose={() => setShowGradeModal(false)}
          onSave={() => { setShowGradeModal(false); fetchGrades(); }}
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  const { overview, byDepartment, byGrade } = stats;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-5 h-5 text-[#8B7355]" />
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
          </div>
          <p className="text-2xl font-bold text-[#3D2E22]">{overview.total_employees}</p>
          <p className="text-sm text-[#8B7355]">Total Employees</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
          <div className="flex items-center justify-between mb-3">
            <Building2 className="w-5 h-5 text-[#8B7355]" />
          </div>
          <p className="text-2xl font-bold text-[#3D2E22]">{overview.total_departments}</p>
          <p className="text-sm text-[#8B7355]">Departments</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
          <div className="flex items-center justify-between mb-3">
            <Award className="w-5 h-5 text-[#8B7355]" />
          </div>
          <p className="text-2xl font-bold text-[#3D2E22]">{overview.total_grades}</p>
          <p className="text-sm text-[#8B7355]">Grade Levels</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#3D2E22]">{overview.status_breakdown?.probation || 0}</p>
          <p className="text-sm text-[#8B7355]">On Probation</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
          <h3 className="font-semibold text-[#3D2E22] mb-4">Employee Status</h3>
          <div className="space-y-3">
            {Object.entries(overview.status_breakdown || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'active' ? 'bg-green-500' :
                    status === 'probation' ? 'bg-amber-500' :
                    status === 'on_notice' ? 'bg-orange-500' :
                    status === 'on_leave' ? 'bg-blue-500' : 'bg-stone-400'
                  }`} />
                  <span className="text-sm text-[#5D4A3A] capitalize">{status.replace('_', ' ')}</span>
                </div>
                <span className="font-medium text-[#3D2E22]">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
          <h3 className="font-semibold text-[#3D2E22] mb-4">Employment Type</h3>
          <div className="space-y-3">
            {Object.entries(overview.employment_type_breakdown || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-[#5D4A3A] capitalize">{type.replace('_', ' ')}</span>
                <span className="font-medium text-[#3D2E22]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Department */}
      <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
        <h3 className="font-semibold text-[#3D2E22] mb-4">Employees by Department</h3>
        <div className="grid grid-cols-3 gap-4">
          {byDepartment?.map(dept => (
            <div key={dept.department_id} className="p-4 bg-[#F5EDE4] rounded-lg">
              <h4 className="font-medium text-[#3D2E22]">{dept.department_name}</h4>
              <p className="text-2xl font-bold text-[#8B7355] my-2">{dept.total_employees}</p>
              <div className="text-xs text-[#8B7355] space-y-1">
                <p>Active: {dept.active}</p>
                {dept.on_notice > 0 && <p className="text-orange-600">On Notice: {dept.on_notice}</p>}
                {dept.probation > 0 && <p className="text-amber-600">Probation: {dept.probation}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Grade */}
      <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
        <h3 className="font-semibold text-[#3D2E22] mb-4">Employees by Grade</h3>
        <div className="space-y-2">
          {byGrade?.filter(g => g.total_employees > 0).map(grade => (
            <div key={grade.grade_id} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-[#3D2E22]">{grade.grade_code}</div>
              <div className="flex-1">
                <div className="h-6 bg-[#F5EDE4] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#8B7355] rounded-full transition-all"
                    style={{ width: `${Math.min(100, (grade.total_employees / (overview.total_employees || 1)) * 100 * 3)}%` }}
                  />
                </div>
              </div>
              <div className="w-12 text-right font-medium text-[#3D2E22]">{grade.total_employees}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Employees Table Component
const EmployeesTable = ({ employees, departments, grades, loading, onEdit, onRefresh }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    probation: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-green-100 text-green-700',
    notice_period: 'bg-orange-100 text-orange-700',
    on_leave: 'bg-blue-100 text-blue-700',
    terminated: 'bg-stone-100 text-stone-600',
    resigned: 'bg-stone-100 text-stone-600'
  };

  const workModeIcons = {
    office: '🏢',
    hybrid: '🔄',
    remote: '🏠'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
      <table className="w-full">
        <thead className="bg-[#F5EDE4]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Department</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Designation</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Grade</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Reports To</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Work Mode</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8D5C4]">
          {employees.map(emp => (
            <tr key={emp.id} className="hover:bg-[#F5EDE4]/50" data-testid={`emp-row-${emp.id}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8B7355]/10 flex items-center justify-center">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-[#8B7355] font-medium">{emp.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#3D2E22]">{emp.name || 'Unnamed'}</p>
                    <p className="text-xs text-[#8B7355]">{emp.employee_id || emp.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-[#5D4A3A]">{emp.department_name || '-'}</span>
                {emp.team_name && <p className="text-xs text-[#8B7355]">{emp.team_name}</p>}
              </td>
              <td className="px-4 py-3">
                <span className="text-[#5D4A3A]">{emp.designation || emp.position_title || '-'}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-[#5D4A3A]">{emp.grade_name || '-'}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-[#5D4A3A]">{emp.manager_name || '-'}</span>
                {emp.secondary_manager_name && (
                  <p className="text-xs text-[#8B7355]">+ {emp.secondary_manager_name}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-sm">
                  {workModeIcons[emp.work_mode] || '🏢'} {emp.work_mode ? emp.work_mode.charAt(0).toUpperCase() + emp.work_mode.slice(1) : 'Office'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[emp.status] || statusColors.active}`}>
                  {emp.status?.replace('_', ' ') || 'active'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button 
                  onClick={() => onEdit(emp)} 
                  className="p-1.5 hover:bg-[#F5EDE4] rounded-md transition-colors"
                  data-testid={`edit-emp-${emp.id}`}
                >
                  <Edit2 className="w-4 h-4 text-[#8B7355]" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {employees.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#3D2E22]">No employees found</h3>
          <p className="text-[#8B7355]">Add employees or adjust your filters</p>
        </div>
      )}
    </div>
  );
};

// Grades Tab Component
const GradesTab = ({ grades, loading, onEdit, onRefresh, onSeed }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (gradeId) => {
    if (!confirm('Delete this grade type?')) return;
    setDeleting(gradeId);
    try {
      await api.delete(`/hr/grades/${gradeId}`);
      toast.success('Grade deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
    setDeleting(null);
  };

  const categoryColors = {
    entry: 'bg-stone-100 text-stone-700',
    associate: 'bg-green-100 text-green-700',
    mid: 'bg-blue-100 text-blue-700',
    senior: 'bg-indigo-100 text-indigo-700',
    lead: 'bg-purple-100 text-purple-700',
    manager: 'bg-pink-100 text-pink-700',
    director: 'bg-red-100 text-red-700',
    executive: 'bg-amber-100 text-amber-700'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-[#E8D5C4]">
        <Award className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#3D2E22]">No grade types found</h3>
        <p className="text-[#8B7355] mb-4">Set up grade types to categorize employees</p>
        <button
          onClick={onSeed}
          className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
        >
          Seed Default Grades
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grades.map(grade => (
        <div 
          key={grade.id} 
          className="bg-white rounded-xl border border-[#E8D5C4] p-5 hover:shadow-md transition-shadow"
          data-testid={`grade-card-${grade.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: grade.color }}
              >
                {grade.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#3D2E22]">{grade.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${categoryColors[grade.category] || categoryColors.entry}`}>
                    {grade.category}
                  </span>
                </div>
                <p className="text-sm text-[#8B7355]">{grade.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#8B7355]">
                  <span>Level: {grade.level}</span>
                  {grade.min_experience_years !== null && (
                    <span>Experience: {grade.min_experience_years}-{grade.max_experience_years || '∞'} years</span>
                  )}
                  <span>{grade.employee_count} employees</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(grade)} className="p-1.5 hover:bg-[#F5EDE4] rounded-md transition-colors">
                <Edit2 className="w-4 h-4 text-[#8B7355]" />
              </button>
              <button 
                onClick={() => handleDelete(grade.id)} 
                disabled={deleting === grade.id || grade.employee_count > 0}
                className="p-1.5 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              >
                {deleting === grade.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-red-500" />
                )}
              </button>
            </div>
          </div>
          
          {grade.benefits && grade.benefits.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E8D5C4]">
              <p className="text-xs font-medium text-[#8B7355] uppercase mb-2">Benefits</p>
              <div className="flex flex-wrap gap-2">
                {grade.benefits.map((benefit, idx) => (
                  <span key={idx} className="px-2 py-1 text-xs bg-[#F5EDE4] text-[#5D4A3A] rounded-full">
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Employee Modal
const EmployeeModal = ({ employee, departments, grades, allEmployees, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    employee_id: employee?.employee_id || '',
    department_id: employee?.department_id || '',
    team_id: employee?.team_id || '',
    position_id: employee?.position_id || '',
    role_id: employee?.role_id || '',
    grade_id: employee?.grade_id || '',
    reports_to: employee?.reports_to || '',
    secondary_manager_id: employee?.secondary_manager_id || '',
    designation: employee?.designation || '',
    employment_type: employee?.employment_type || 'full_time',
    work_mode: employee?.work_mode || 'office',
    status: employee?.status || 'active',
    joining_date: employee?.joining_date || '',
    phone: employee?.phone || '',
    gender: employee?.gender || '',
    work_location: employee?.work_location || '',
  });
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    // Fetch teams when department changes
    if (form.department_id) {
      fetchTeamsByDept(form.department_id);
    }
  }, [form.department_id]);

  const fetchOptions = async () => {
    try {
      const [rolesRes, teamsRes, positionsRes] = await Promise.all([
        api.get('/workos/roles'),
        api.get('/hr/teams'),
        api.get('/hr/positions')
      ]);
      setRoles(rolesRes.data);
      setTeams(teamsRes.data);
      setPositions(positionsRes.data);
    } catch (err) {
      console.error('Failed to fetch options');
    }
  };

  const fetchTeamsByDept = async (deptId) => {
    try {
      const res = await api.get(`/hr/teams?department_id=${deptId}`);
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (employee) {
        await api.put(`/hr/employees/${employee.id}`, form);
        toast.success('Employee updated');
      } else {
        await api.post('/hr/employees', form);
        toast.success('Employee created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  const managers = allEmployees.filter(e => e.id !== employee?.id);
  const filteredTeams = form.department_id ? teams.filter(t => t.department_id === form.department_id) : teams;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl w-full max-w-3xl mx-4 my-auto" data-testid="employee-modal">
        <div className="p-6 border-b border-[#E8D5C4]">
          <h2 className="text-lg font-semibold text-[#3D2E22]">
            {employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
                required
                disabled={!!employee}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Employee ID</label>
              <input
                type="text"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                placeholder="Auto: EMP-0001"
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg bg-[#F5EDE4]/50"
                disabled={!!employee}
              />
            </div>
          </div>

          {/* Organization */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Department *</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value, team_id: '' })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
                required
              >
                <option value="">Select...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Team</label>
              <select
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="">Select team...</option>
                {filteredTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Grade</label>
              <select
                value={form.grade_id}
                onChange={(e) => setForm({ ...form, grade_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="">Select grade...</option>
                {grades.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Position & Designation */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Position</label>
              <select
                value={form.position_id}
                onChange={(e) => setForm({ ...form, position_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="">Select position...</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g., Senior Developer"
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">System Role</label>
              <select
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="">Select role...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reporting */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Reporting Manager</label>
              <select
                value={form.reports_to}
                onChange={(e) => setForm({ ...form, reports_to: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="">No manager</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.designation || m.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Secondary Manager (Dotted Line)</label>
              <select
                value={form.secondary_manager_id}
                onChange={(e) => setForm({ ...form, secondary_manager_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="">None</option>
                {managers.filter(m => m.id !== form.reports_to).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.designation || m.email})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Employment Details */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Employment Type</label>
              <select
                value={form.employment_type}
                onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Work Mode</label>
              <select
                value={form.work_mode}
                onChange={(e) => setForm({ ...form, work_mode: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="office">Office</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="confirmed">Confirmed</option>
                <option value="notice_period">Notice Period</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Joining Date</label>
              <input
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              />
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Work Location</label>
              <input
                type="text"
                value={form.work_location}
                onChange={(e) => setForm({ ...form, work_location: e.target.value })}
                placeholder="e.g., Mumbai Office"
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8D5C4]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#5D4A3A] hover:bg-[#F5EDE4] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (employee ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Grade Modal
const GradeModal = ({ grade, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: grade?.name || '',
    code: grade?.code || '',
    category: grade?.category || 'entry',
    level: grade?.level || 1,
    min_experience_years: grade?.min_experience_years || '',
    max_experience_years: grade?.max_experience_years || '',
    description: grade?.description || '',
    salary_band_min: grade?.salary_band_min || '',
    salary_band_max: grade?.salary_band_max || '',
    color: grade?.color || '#8B7355',
    benefits: grade?.benefits?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        min_experience_years: form.min_experience_years ? parseFloat(form.min_experience_years) : null,
        max_experience_years: form.max_experience_years ? parseFloat(form.max_experience_years) : null,
        salary_band_min: form.salary_band_min ? parseFloat(form.salary_band_min) : null,
        salary_band_max: form.salary_band_max ? parseFloat(form.salary_band_max) : null,
        benefits: form.benefits ? form.benefits.split(',').map(b => b.trim()).filter(Boolean) : [],
      };
      
      if (grade) {
        await api.put(`/hr/grades/${grade.id}`, payload);
        toast.success('Grade updated');
      } else {
        await api.post('/hr/grades', payload);
        toast.success('Grade created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4" data-testid="grade-modal">
        <div className="p-6 border-b border-[#E8D5C4]">
          <h2 className="text-lg font-semibold text-[#3D2E22]">
            {grade ? 'Edit Grade Type' : 'Add Grade Type'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., L4 - Senior Associate"
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g., L4"
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
                required
                disabled={!!grade}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              >
                <option value="entry">Entry Level</option>
                <option value="associate">Associate</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="manager">Manager</option>
                <option value="director">Director</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Level (1-20)</label>
              <input
                type="number"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
                min="1"
                max="20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Min Experience (Years)</label>
              <input
                type="number"
                step="0.5"
                value={form.min_experience_years}
                onChange={(e) => setForm({ ...form, min_experience_years: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3D2E22] mb-1">Max Experience (Years)</label>
              <input
                type="number"
                step="0.5"
                value={form.max_experience_years}
                onChange={(e) => setForm({ ...form, max_experience_years: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Benefits (comma-separated)</label>
            <input
              type="text"
              value={form.benefits}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })}
              placeholder="Health Insurance, Stock Options, WFH"
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-16 h-10 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8D5C4]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#5D4A3A] hover:bg-[#F5EDE4] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (grade ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeDatabase;
