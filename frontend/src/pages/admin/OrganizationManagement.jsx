import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import { 
  Building2, Network, Award, ChevronRight, Plus, Edit2, Trash2,
  Loader2, RefreshCw, Briefcase, Layers, MoreVertical, Users, Mail, User
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

const OrganizationManagement = () => {
  const [activeTab, setActiveTab] = useState('org-chart');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orgChart, setOrgChart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // View modes
  const [deptView, setDeptView] = useState('hierarchy');
  const [positionView, setPositionView] = useState('hierarchy');
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [expandedPositions, setExpandedPositions] = useState(new Set());

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'org-chart') fetchOrgChart();
    else if (activeTab === 'departments') fetchDepartments();
    else if (activeTab === 'positions') fetchPositions();
    else if (activeTab === 'grades') fetchGrades();
    else if (activeTab === 'teams') fetchTeams();
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/hr/departments'),
        api.get('/hr/employees?limit=200')
      ]);
      setDepartments(deptRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  const fetchOrgChart = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/org-chart');
      setOrgChart(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      console.error('Failed to fetch org chart:', err);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/departments');
      setDepartments(res.data || []);
    } catch (err) {
      toast.error('Failed to load departments');
    }
    setLoading(false);
  };

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/positions');
      setPositions(res.data || []);
    } catch (err) {
      toast.error('Failed to load positions');
    }
    setLoading(false);
  };

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/grades');
      setGrades(res.data || []);
    } catch (err) {
      toast.error('Failed to load grades');
    }
    setLoading(false);
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/teams');
      setTeams(res.data || []);
    } catch (err) {
      toast.error('Failed to load teams');
    }
    setLoading(false);
  };

  const seedPositions = async () => {
    try {
      const res = await api.post('/hr/seed-positions');
      toast.success(res.data.message);
      fetchPositions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to seed positions');
    }
  };

  const tabs = [
    { id: 'org-chart', label: 'Org Chart', icon: Network },
    { id: 'departments', label: 'Departments', icon: Building2, count: departments.length },
    { id: 'positions', label: 'Positions', icon: Briefcase, count: positions.length },
    { id: 'teams', label: 'Teams', icon: Users, count: teams.length },
    { id: 'grades', label: 'Grades', icon: Award, count: grades.length },
  ];

  const getAddButton = () => {
    switch(activeTab) {
      case 'departments':
        return <Button onClick={() => { setEditingItem(null); setShowDeptModal(true); }} className="bg-[#8B7355] hover:bg-[#6B5A45]"><Plus className="w-4 h-4 mr-2" />Add Department</Button>;
      case 'positions':
        return <Button onClick={() => { setEditingItem(null); setShowPositionModal(true); }} className="bg-[#8B7355] hover:bg-[#6B5A45]"><Plus className="w-4 h-4 mr-2" />Add Position</Button>;
      case 'grades':
        return <Button onClick={() => { setEditingItem(null); setShowGradeModal(true); }} className="bg-[#8B7355] hover:bg-[#6B5A45]"><Plus className="w-4 h-4 mr-2" />Add Grade</Button>;
      case 'teams':
        return <Button onClick={() => { setEditingItem(null); setShowTeamModal(true); }} className="bg-[#8B7355] hover:bg-[#6B5A45]"><Plus className="w-4 h-4 mr-2" />Add Team</Button>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="organization-management">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
        <Building2 className="w-4 h-4" />
        <span>Administration</span>
        <ChevronRight className="w-4 h-4" />
        <span>Organization Management</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Organization Management</h1>
          <p className="text-[#5D4A3A] text-sm mt-1">Manage organizational structure, departments, positions, teams, and grades</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (activeTab === 'org-chart') fetchOrgChart();
              else if (activeTab === 'departments') fetchDepartments();
              else if (activeTab === 'positions') fetchPositions();
              else if (activeTab === 'grades') fetchGrades();
              else fetchTeams();
            }}
            className="border-[#E8D5C4]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {getAddButton()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <User className="h-6 w-6 mx-auto text-purple-600 mb-1" />
            <p className="text-xl font-bold text-[#4A3728]">{employees.length}</p>
            <p className="text-xs text-[#5D4A3A]">Employees</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 mx-auto text-[#8B7355] mb-1" />
            <p className="text-xl font-bold text-[#4A3728]">{departments.length}</p>
            <p className="text-xs text-[#5D4A3A]">Departments</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Briefcase className="h-6 w-6 mx-auto text-blue-600 mb-1" />
            <p className="text-xl font-bold text-[#4A3728]">{positions.length}</p>
            <p className="text-xs text-[#5D4A3A]">Positions</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-green-600 mb-1" />
            <p className="text-xl font-bold text-[#4A3728]">{teams.length}</p>
            <p className="text-xs text-[#5D4A3A]">Teams</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 mx-auto text-orange-600 mb-1" />
            <p className="text-xl font-bold text-[#4A3728]">{grades.length}</p>
            <p className="text-xs text-[#5D4A3A]">Grades</p>
          </CardContent>
        </Card>
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
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 bg-[#8B7355]/10">{tab.count}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Org Chart Tab */}
        <TabsContent value="org-chart">
          <OrgChartView orgChart={orgChart} loading={loading} />
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <DepartmentsTab 
            departments={departments} employees={employees} loading={loading}
            onEdit={(dept) => { setEditingItem(dept); setShowDeptModal(true); }}
            onRefresh={fetchDepartments} viewMode={deptView} setViewMode={setDeptView}
            expandedDepts={expandedDepts} setExpandedDepts={setExpandedDepts}
          />
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions">
          <PositionsTab 
            positions={positions} departments={departments} loading={loading}
            onEdit={(pos) => { setEditingItem(pos); setShowPositionModal(true); }}
            onRefresh={fetchPositions} onSeed={seedPositions}
            viewMode={positionView} setViewMode={setPositionView}
            expandedPositions={expandedPositions} setExpandedPositions={setExpandedPositions}
          />
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <TeamsTab 
            teams={teams} departments={departments} employees={employees} loading={loading}
            onEdit={(team) => { setEditingItem(team); setShowTeamModal(true); }}
            onRefresh={fetchTeams}
          />
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades">
          <GradesTab grades={grades} loading={loading}
            onEdit={(grade) => { setEditingItem(grade); setShowGradeModal(true); }}
            onRefresh={fetchGrades}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showDeptModal && <DepartmentModal department={editingItem} departments={departments} employees={employees} onClose={() => setShowDeptModal(false)} onSave={() => { setShowDeptModal(false); fetchDepartments(); }} />}
      {showPositionModal && <PositionModal position={editingItem} departments={departments} positions={positions} onClose={() => setShowPositionModal(false)} onSave={() => { setShowPositionModal(false); fetchPositions(); }} />}
      {showGradeModal && <GradeModal grade={editingItem} onClose={() => setShowGradeModal(false)} onSave={() => { setShowGradeModal(false); fetchGrades(); }} />}
      {showTeamModal && <TeamModal team={editingItem} departments={departments} employees={employees} onClose={() => setShowTeamModal(false)} onSave={() => { setShowTeamModal(false); fetchTeams(); }} />}
    </div>
  );
};

// Org Chart View
const OrgChartView = ({ orgChart, loading }) => {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const toggleNode = (nodeId) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = new Set();
    const collectIds = (nodes) => {
      nodes.forEach(node => {
        if (node.children?.length > 0) { allIds.add(node.id); collectIds(node.children); }
      });
    };
    collectIds(orgChart);
    setExpandedIds(allIds);
  };

  const renderOrgNode = (node, level = 0, isLast = true) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <div key={node.id} className="relative">
        {level > 0 && (
          <div className="absolute left-0 top-0 w-8 h-full">
            <div className="absolute left-4 top-0 w-4 h-6 border-l-2 border-b-2 border-[#E8D5C4] rounded-bl-lg" />
            {!isLast && <div className="absolute left-4 top-0 bottom-0 border-l-2 border-[#E8D5C4]" />}
          </div>
        )}
        <div className={`${level > 0 ? 'ml-8' : ''}`}>
          <div 
            className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8D5C4] hover:border-[#8B7355] hover:shadow-md transition-all mb-2 cursor-pointer ${selectedEmployee?.id === node.id ? 'ring-2 ring-[#8B7355]' : ''}`}
            onClick={() => setSelectedEmployee(node)}
          >
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }} className="p-1 hover:bg-[#F5EDE4] rounded">
                <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : <div className="w-6" />}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B7355] to-[#6B5A45] flex items-center justify-center text-white font-medium">
              {node.avatar_url ? <img src={node.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : node.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#3D2E22] truncate">{node.name}</p>
              <p className="text-sm text-[#8B7355] truncate">{node.title || node.designation || 'Employee'}</p>
            </div>
            <div className="text-right flex-shrink-0">
              {node.department_name && <Badge variant="secondary" className="text-xs bg-[#F5EDE4] text-[#5D4A3A]">{node.department_name}</Badge>}
              {hasChildren && <p className="text-xs text-[#8B7355] mt-1">{node.children.length} direct reports</p>}
            </div>
          </div>
          {hasChildren && isExpanded && <div className="ml-4">{node.children.map((child, idx) => renderOrgNode(child, level + 1, idx === node.children.length - 1))}</div>}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" /></div>;

  if (!orgChart || orgChart.length === 0) {
    return (
      <Card className="border-[#E8D5C4]">
        <CardContent className="text-center py-12">
          <Network className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#3D2E22]">No Organization Chart Data</h3>
          <p className="text-[#8B7355] mt-2">Assign reporting managers to employees to build the org chart</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="border-[#E8D5C4]">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#3D2E22]">Organization Hierarchy</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="border-[#E8D5C4]">Expand All</Button>
              <Button variant="outline" size="sm" onClick={() => setExpandedIds(new Set())} className="border-[#E8D5C4]">Collapse All</Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-2">{orgChart.map((node, idx) => renderOrgNode(node, 0, idx === orgChart.length - 1))}</div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card className="border-[#E8D5C4] sticky top-6">
          <CardHeader className="pb-3"><CardTitle className="text-lg text-[#3D2E22]">Employee Details</CardTitle></CardHeader>
          <CardContent>
            {selectedEmployee ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8B7355] to-[#6B5A45] flex items-center justify-center text-white text-2xl font-bold mx-auto">
                    {selectedEmployee.avatar_url ? <img src={selectedEmployee.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" /> : selectedEmployee.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[#3D2E22]">{selectedEmployee.name}</h3>
                  <p className="text-[#8B7355]">{selectedEmployee.title || selectedEmployee.designation || 'Employee'}</p>
                </div>
                <div className="space-y-3 pt-4 border-t border-[#E8D5C4]">
                  {selectedEmployee.email && <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-[#8B7355]" /><span className="text-[#5D4A3A]">{selectedEmployee.email}</span></div>}
                  {selectedEmployee.department_name && <div className="flex items-center gap-3 text-sm"><Building2 className="w-4 h-4 text-[#8B7355]" /><span className="text-[#5D4A3A]">{selectedEmployee.department_name}</span></div>}
                  {selectedEmployee.grade_name && <div className="flex items-center gap-3 text-sm"><Award className="w-4 h-4 text-[#8B7355]" /><span className="text-[#5D4A3A]">{selectedEmployee.grade_name}</span></div>}
                  {selectedEmployee.children?.length > 0 && <div className="flex items-center gap-3 text-sm"><Users className="w-4 h-4 text-[#8B7355]" /><span className="text-[#5D4A3A]">{selectedEmployee.children.length} Direct Reports</span></div>}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B7355]">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select an employee to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Departments Tab
const DepartmentsTab = ({ departments, employees, loading, onEdit, onRefresh, viewMode, setViewMode, expandedDepts, setExpandedDepts }) => {
  const [deleting, setDeleting] = useState(null);

  const deptHierarchy = useMemo(() => {
    const rootDepts = departments.filter(d => !d.parent_department_id);
    const buildTree = (parentId) => departments.filter(d => d.parent_department_id === parentId).map(dept => ({ ...dept, children: buildTree(dept.id) }));
    return rootDepts.map(dept => ({ ...dept, children: buildTree(dept.id) }));
  }, [departments]);

  const toggleDept = (deptId) => {
    setExpandedDepts(prev => { const newSet = new Set(prev); if (newSet.has(deptId)) newSet.delete(deptId); else newSet.add(deptId); return newSet; });
  };

  const handleDelete = async (deptId) => {
    if (!confirm('Delete this department?')) return;
    setDeleting(deptId);
    try { await api.delete(`/workos/departments/${deptId}`); toast.success('Department deleted'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
    setDeleting(null);
  };

  const renderDeptNode = (dept, level = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedDepts.has(dept.id);
    return (
      <div key={dept.id}>
        <div className="flex items-center gap-3 p-4 bg-white border border-[#E8D5C4] rounded-lg hover:shadow-md transition-all mb-2" style={{ marginLeft: level > 0 ? `${level * 24}px` : 0 }}>
          {hasChildren ? <button onClick={() => toggleDept(dept.id)} className="p-1 hover:bg-[#F5EDE4] rounded"><ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button> : <div className="w-6" />}
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${dept.color || '#8B7355'}20` }}><Building2 className="w-5 h-5" style={{ color: dept.color || '#8B7355' }} /></div>
          <div className="flex-1 min-w-0"><p className="font-medium text-[#3D2E22]">{dept.name}</p><p className="text-sm text-[#8B7355]">{dept.code}</p></div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-sm font-medium text-[#3D2E22]">{dept.member_count || 0}</p><p className="text-xs text-[#8B7355]">Members</p></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(dept)}><Edit2 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(dept.id)} disabled={dept.member_count > 0} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {hasChildren && isExpanded && <div>{dept.children.map(child => renderDeptNode(child, level + 1))}</div>}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#3D2E22]">Department Hierarchy</h3>
        <div className="flex gap-2">
          <Button variant={viewMode === 'hierarchy' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('hierarchy')} className={viewMode === 'hierarchy' ? 'bg-[#8B7355]' : 'border-[#E8D5C4]'}><Network className="w-4 h-4 mr-1" /> Hierarchy</Button>
          <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')} className={viewMode === 'cards' ? 'bg-[#8B7355]' : 'border-[#E8D5C4]'}><Layers className="w-4 h-4 mr-1" /> Cards</Button>
        </div>
      </div>
      {viewMode === 'hierarchy' ? <div className="space-y-2">{deptHierarchy.map(dept => renderDeptNode(dept))}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <Card key={dept.id} className="border-[#E8D5C4] hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${dept.color || '#8B7355'}20` }}><Building2 className="w-6 h-6" style={{ color: dept.color || '#8B7355' }} /></div>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(dept)}><Edit2 className="w-4 h-4" /></Button>
                </div>
                <h4 className="font-semibold text-[#3D2E22]">{dept.name}</h4>
                <p className="text-sm text-[#8B7355] mb-3">{dept.description || 'No description'}</p>
                <div className="flex items-center justify-between text-sm"><span className="text-[#8B7355]">{dept.member_count || 0} members</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Positions Tab
const PositionsTab = ({ positions, departments, loading, onEdit, onRefresh, onSeed, viewMode, setViewMode, expandedPositions, setExpandedPositions }) => {
  const [deleting, setDeleting] = useState(null);
  const levelOrder = ['ceo', 'vp', 'director', 'manager', 'lead', 'executive', 'associate'];
  const levelColors = {
    ceo: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    vp: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    director: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    manager: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    lead: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    executive: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    associate: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' }
  };

  const positionHierarchy = useMemo(() => {
    const rootPositions = positions.filter(p => !p.reporting_position_id);
    const buildTree = (parentId) => positions.filter(p => p.reporting_position_id === parentId).map(pos => ({ ...pos, children: buildTree(pos.id) }));
    return rootPositions.map(pos => ({ ...pos, children: buildTree(pos.id) }));
  }, [positions]);

  const togglePosition = (posId) => {
    setExpandedPositions(prev => { const newSet = new Set(prev); if (newSet.has(posId)) newSet.delete(posId); else newSet.add(posId); return newSet; });
  };

  const handleDelete = async (posId) => {
    if (!confirm('Delete this position?')) return;
    setDeleting(posId);
    try { await api.delete(`/hr/positions/${posId}`); toast.success('Position deleted'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
    setDeleting(null);
  };

  const renderPositionNode = (pos, level = 0) => {
    const hasChildren = pos.children && pos.children.length > 0;
    const isExpanded = expandedPositions.has(pos.id);
    const colors = levelColors[pos.level] || levelColors.associate;
    return (
      <div key={pos.id}>
        <div className={`flex items-center gap-3 p-4 bg-white border ${colors.border} rounded-lg hover:shadow-md transition-all mb-2`} style={{ marginLeft: level > 0 ? `${level * 24}px` : 0 }}>
          {hasChildren ? <button onClick={() => togglePosition(pos.id)} className="p-1 hover:bg-[#F5EDE4] rounded"><ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button> : <div className="w-6" />}
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}><Briefcase className={`w-5 h-5 ${colors.text}`} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2"><p className="font-medium text-[#3D2E22]">{pos.title}</p><Badge className={`${colors.bg} ${colors.text} text-xs`}>{pos.level.toUpperCase()}</Badge></div>
            <p className="text-sm text-[#8B7355]">{pos.code}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-sm font-medium text-[#3D2E22]">{pos.employee_count || 0}</p><p className="text-xs text-[#8B7355]">Employees</p></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(pos)}><Edit2 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(pos.id)} disabled={pos.employee_count > 0} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {hasChildren && isExpanded && <div>{pos.children.map(child => renderPositionNode(child, level + 1))}</div>}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" /></div>;

  if (positions.length === 0) {
    return (
      <Card className="border-[#E8D5C4]">
        <CardContent className="text-center py-12">
          <Briefcase className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#3D2E22]">No Positions Found</h3>
          <p className="text-[#8B7355] mb-4">Set up position hierarchy for your organization</p>
          <Button onClick={onSeed} className="bg-[#8B7355] hover:bg-[#6B5A45]">Seed Default Positions</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#3D2E22]">Position Hierarchy <span className="text-sm font-normal text-[#8B7355] ml-2">(CEO → VP → Director → Manager → Lead → Executive → Associate)</span></h3>
        <div className="flex gap-2">
          <Button variant={viewMode === 'hierarchy' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('hierarchy')} className={viewMode === 'hierarchy' ? 'bg-[#8B7355]' : 'border-[#E8D5C4]'}><Network className="w-4 h-4 mr-1" /> Hierarchy</Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')} className={viewMode === 'table' ? 'bg-[#8B7355]' : 'border-[#E8D5C4]'}><Layers className="w-4 h-4 mr-1" /> Table</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">{levelOrder.map(level => <Badge key={level} className={`${levelColors[level].bg} ${levelColors[level].text} text-xs`}>{level.toUpperCase()}</Badge>)}</div>
      {viewMode === 'hierarchy' ? <div className="space-y-2">{positionHierarchy.map(pos => renderPositionNode(pos))}</div> : (
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="bg-[#F5EDE5]"><TableHead>Position</TableHead><TableHead>Code</TableHead><TableHead>Level</TableHead><TableHead>Employees</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {positions.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)).map(pos => {
                  const colors = levelColors[pos.level] || levelColors.associate;
                  return (
                    <TableRow key={pos.id} className="hover:bg-[#F5EDE5]/50">
                      <TableCell><p className="font-medium text-[#3D2E22]">{pos.title}</p></TableCell>
                      <TableCell><span className="font-mono text-sm text-[#5D4A3A]">{pos.code}</span></TableCell>
                      <TableCell><Badge className={`${colors.bg} ${colors.text} text-xs`}>{pos.level.toUpperCase()}</Badge></TableCell>
                      <TableCell>{pos.employee_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(pos)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(pos.id)} disabled={pos.employee_count > 0} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Teams Tab
const TeamsTab = ({ teams, departments, employees, loading, onEdit, onRefresh }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (teamId) => {
    if (!confirm('Delete this team?')) return;
    setDeleting(teamId);
    try { await api.delete(`/hr/teams/${teamId}`); toast.success('Team deleted'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
    setDeleting(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" /></div>;

  if (teams.length === 0) {
    return (
      <Card className="border-[#E8D5C4]">
        <CardContent className="text-center py-12">
          <Users className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#3D2E22]">No Teams Found</h3>
          <p className="text-[#8B7355]">Create teams within departments to organize employees</p>
        </CardContent>
      </Card>
    );
  }

  const teamsByDept = departments.reduce((acc, dept) => {
    acc[dept.id] = { department: dept, teams: teams.filter(t => t.department_id === dept.id) };
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.values(teamsByDept).filter(g => g.teams.length > 0).map(({ department, teams: deptTeams }) => (
        <Card key={department.id} className="border-[#E8D5C4]">
          <CardHeader className="bg-[#F5EDE4] border-b border-[#E8D5C4] py-3">
            <CardTitle className="text-base font-semibold text-[#3D2E22] flex items-center justify-between">
              <span>{department.name}</span>
              <Badge variant="secondary">{deptTeams.length} team(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#E8D5C4]">
            {deptTeams.map(team => (
              <div key={team.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#F5EDE4]/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#8B7355]/10 flex items-center justify-center"><Users className="w-5 h-5 text-[#8B7355]" /></div>
                  <div><p className="font-medium text-[#3D2E22]">{team.name}</p><p className="text-sm text-[#8B7355]">{team.description || 'No description'}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#3D2E22]">{team.member_count} members</p>
                    {team.team_lead_name && <p className="text-xs text-[#8B7355]">Lead: {team.team_lead_name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(team)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)} disabled={team.member_count > 0} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Grades Tab
const GradesTab = ({ grades, loading, onEdit, onRefresh }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (gradeId) => {
    if (!confirm('Delete this grade?')) return;
    setDeleting(gradeId);
    try { await api.delete(`/hr/grades/${gradeId}`); toast.success('Grade deleted'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
    setDeleting(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#3D2E22]">Grade Types</h3>
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-[#F5EDE5]"><TableHead>Grade</TableHead><TableHead>Code</TableHead><TableHead>Level</TableHead><TableHead>Employees</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {grades.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#5D4A3A]">No grades found</TableCell></TableRow> :
                grades.sort((a, b) => (a.level || 0) - (b.level || 0)).map(grade => (
                  <TableRow key={grade.id} className="hover:bg-[#F5EDE5]/50">
                    <TableCell><div><p className="font-medium text-[#3D2E22]">{grade.name}</p>{grade.description && <p className="text-sm text-[#8B7355]">{grade.description}</p>}</div></TableCell>
                    <TableCell><code className="text-sm bg-[#F5EDE5] px-2 py-1 rounded">{grade.code}</code></TableCell>
                    <TableCell><Badge variant="outline">{grade.level || 0}</Badge></TableCell>
                    <TableCell>{grade.employee_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(grade)}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(grade.id)} disabled={grade.employee_count > 0} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Modals
const DepartmentModal = ({ department, departments, employees, onClose, onSave }) => {
  const [form, setForm] = useState({ name: department?.name || '', code: department?.code || '', description: department?.description || '', color: department?.color || '#8B7355', parent_department_id: department?.parent_department_id || '', department_head_id: department?.department_head_id || '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, parent_department_id: form.parent_department_id || null, department_head_id: form.department_head_id || null };
      if (department) { await api.put(`/hr/departments/${department.id}`, payload); toast.success('Department updated'); }
      else { await api.post('/workos/departments', payload); toast.success('Department created'); }
      onSave();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    setSaving(false);
  };
  const parentDepts = departments.filter(d => d.id !== department?.id);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{department ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-[#E8D5C4]" /></div>
          <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })} required disabled={!!department} className="border-[#E8D5C4]" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="border-[#E8D5C4]" /></div>
          <div><Label>Parent Department</Label><Select value={form.parent_department_id || "none"} onValueChange={(v) => setForm({ ...form, parent_department_id: v === "none" ? "" : v })}><SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{parentDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Department Head</Label><Select value={form.department_head_id || "none"} onValueChange={(v) => setForm({ ...form, department_head_id: v === "none" ? "" : v })}><SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Color</Label><div className="flex gap-2"><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded" /><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1 border-[#E8D5C4]" /></div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} className="border-[#E8D5C4]">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#8B7355] hover:bg-[#6B5A45]">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{department ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PositionModal = ({ position, departments, positions, onClose, onSave }) => {
  const [form, setForm] = useState({ title: position?.title || '', code: position?.code || '', level: position?.level || 'associate', department_id: position?.department_id || '', reporting_position_id: position?.reporting_position_id || '', description: position?.description || '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form }; if (!payload.department_id) delete payload.department_id; if (!payload.reporting_position_id) delete payload.reporting_position_id;
      if (position) { await api.put(`/hr/positions/${position.id}`, payload); toast.success('Position updated'); }
      else { await api.post('/hr/positions', payload); toast.success('Position created'); }
      onSave();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    setSaving(false);
  };
  const parentPositions = positions.filter(p => p.id !== position?.id);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{position ? 'Edit Position' : 'Add Position'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="border-[#E8D5C4]" /></div>
          <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })} required disabled={!!position} className="border-[#E8D5C4]" /></div>
          <div><Label>Level *</Label><Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}><SelectTrigger className="border-[#E8D5C4]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ceo">CEO</SelectItem><SelectItem value="vp">Vice President</SelectItem><SelectItem value="director">Director</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="lead">Team Lead</SelectItem><SelectItem value="executive">Executive</SelectItem><SelectItem value="associate">Associate</SelectItem></SelectContent></Select></div>
          <div><Label>Department</Label><Select value={form.department_id || "none"} onValueChange={(v) => setForm({ ...form, department_id: v === "none" ? "" : v })}><SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="none">All Departments</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Reports To</Label><Select value={form.reporting_position_id || "none"} onValueChange={(v) => setForm({ ...form, reporting_position_id: v === "none" ? "" : v })}><SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{parentPositions.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} className="border-[#E8D5C4]">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#8B7355] hover:bg-[#6B5A45]">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{position ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const GradeModal = ({ grade, onClose, onSave }) => {
  const [form, setForm] = useState({ name: grade?.name || '', code: grade?.code || '', description: grade?.description || '', level: grade?.level || 1 });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (grade) { await api.put(`/hr/grades/${grade.id}`, form); toast.success('Grade updated'); }
      else { await api.post('/hr/grades', form); toast.success('Grade created'); }
      onSave();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    setSaving(false);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{grade ? 'Edit Grade' : 'Add Grade'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-[#E8D5C4]" /></div>
          <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })} required disabled={!!grade} className="border-[#E8D5C4]" /></div>
          <div><Label>Level</Label><Input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 1 })} min={1} max={20} className="border-[#E8D5C4]" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="border-[#E8D5C4]" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} className="border-[#E8D5C4]">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#8B7355] hover:bg-[#6B5A45]">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{grade ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TeamModal = ({ team, departments, employees, onClose, onSave }) => {
  const [form, setForm] = useState({ name: team?.name || '', code: team?.code || '', department_id: team?.department_id || '', team_lead_id: team?.team_lead_id || '', description: team?.description || '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (team) { await api.put(`/hr/teams/${team.id}`, form); toast.success('Team updated'); }
      else { await api.post('/hr/teams', form); toast.success('Team created'); }
      onSave();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    setSaving(false);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{team ? 'Edit Team' : 'Add Team'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border-[#E8D5C4]" /></div>
          <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })} required disabled={!!team} className="border-[#E8D5C4]" /></div>
          <div><Label>Department *</Label><Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}><SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Team Lead</Label><Select value={form.team_lead_id || "none"} onValueChange={(v) => setForm({ ...form, team_lead_id: v === "none" ? "" : v })}><SelectTrigger className="border-[#E8D5C4]"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="border-[#E8D5C4]" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} className="border-[#E8D5C4]">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#8B7355] hover:bg-[#6B5A45]">{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{team ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationManagement;
