import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Users, Building2, GitBranch, Briefcase, ChevronRight, Plus, Edit2, Trash2,
  Loader2, RefreshCw, Search, UserPlus, ChevronDown, ChevronUp, Network,
  UserCheck, MapPin, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const OrganizationStructure = () => {
  const [activeTab, setActiveTab] = useState('org-chart');
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [positions, setPositions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgChart, setOrgChart] = useState([]);
  
  // Modal states
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'org-chart') {
      fetchOrgChart();
    } else if (activeTab === 'teams') {
      fetchTeams();
    } else if (activeTab === 'positions') {
      fetchPositions();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/hr/departments'),
        api.get('/hr/employees?limit=200')
      ]);
      setDepartments(deptRes.data);
      setEmployees(empRes.data);
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

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/teams');
      setTeams(res.data);
    } catch (err) {
      toast.error('Failed to load teams');
    }
    setLoading(false);
  };

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/positions');
      setPositions(res.data);
    } catch (err) {
      toast.error('Failed to load positions');
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
    { id: 'teams', label: 'Teams', icon: Users, count: teams.length },
    { id: 'positions', label: 'Positions', icon: Briefcase, count: positions.length },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="org-structure">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
          <Building2 className="w-4 h-4" />
          <span>HR</span>
          <ChevronRight className="w-4 h-4" />
          <span>Organization Structure</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2E22]">Organization Structure</h1>
            <p className="text-[#8B7355] mt-1">Manage teams, positions, and reporting hierarchy</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => activeTab === 'org-chart' ? fetchOrgChart() : activeTab === 'teams' ? fetchTeams() : fetchPositions()}
              className="p-2 rounded-lg border border-[#E8D5C4] hover:bg-[#F5EDE4] transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-[#5D4A3A] ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'teams' && (
              <button
                onClick={() => { setEditingItem(null); setShowTeamModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                data-testid="add-team-btn"
              >
                <Plus className="w-4 h-4" />
                Add Team
              </button>
            )}
            {activeTab === 'positions' && (
              <button
                onClick={() => { setEditingItem(null); setShowPositionModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                data-testid="add-position-btn"
              >
                <Plus className="w-4 h-4" />
                Add Position
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#8B7355]/10 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Org Chart Tab */}
      {activeTab === 'org-chart' && (
        <OrgChartView orgChart={orgChart} loading={loading} />
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <TeamsTab 
          teams={teams}
          departments={departments}
          employees={employees}
          loading={loading}
          onEdit={(team) => { setEditingItem(team); setShowTeamModal(true); }}
          onRefresh={fetchTeams}
        />
      )}

      {/* Positions Tab */}
      {activeTab === 'positions' && (
        <PositionsTab 
          positions={positions}
          departments={departments}
          loading={loading}
          onEdit={(pos) => { setEditingItem(pos); setShowPositionModal(true); }}
          onRefresh={fetchPositions}
          onSeed={seedPositions}
        />
      )}

      {/* Modals */}
      {showTeamModal && (
        <TeamModal
          team={editingItem}
          departments={departments}
          employees={employees}
          onClose={() => setShowTeamModal(false)}
          onSave={() => { setShowTeamModal(false); fetchTeams(); }}
        />
      )}
      {showPositionModal && (
        <PositionModal
          position={editingItem}
          departments={departments}
          positions={positions}
          onClose={() => setShowPositionModal(false)}
          onSave={() => { setShowPositionModal(false); fetchPositions(); }}
        />
      )}
    </div>
  );
};

// Org Chart View Component
const OrgChartView = ({ orgChart, loading }) => {
  const [expandedIds, setExpandedIds] = useState([]);

  const toggleNode = (nodeId) => {
    setExpandedIds(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId) 
        : [...prev, nodeId]
    );
  };

  // Simple recursive render function
  const renderNode = (node, level) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.includes(node.id);

    return (
      <div key={node.id} className={`${level > 0 ? 'ml-8 border-l-2 border-[#E8D5C4] pl-4' : ''}`}>
        <div 
          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8D5C4] hover:shadow-md transition-shadow mb-2 cursor-pointer"
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren ? (
            <button className="p-1 hover:bg-[#F5EDE4] rounded">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          <div className="w-10 h-10 rounded-full bg-[#8B7355]/10 flex items-center justify-center">
            {node.avatar_url ? (
              <img src={node.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="text-[#8B7355] font-medium">{node.name?.charAt(0) || '?'}</span>
            )}
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-[#3D2E22]">{node.name}</p>
            <p className="text-sm text-[#8B7355]">{node.designation || 'Employee'}</p>
          </div>
          
          <div className="text-right">
            {node.department_name && (
              <span className="text-xs px-2 py-1 bg-[#F5EDE4] text-[#5D4A3A] rounded-full">{node.department_name}</span>
            )}
            {hasChildren && (
              <p className="text-xs text-[#8B7355] mt-1">{node.children.length} reports</p>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (!orgChart || orgChart.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-[#E8D5C4]">
        <Network className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#3D2E22]">No org chart data</h3>
        <p className="text-[#8B7355]">Assign reporting managers to employees to build the org chart</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8D5C4] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-[#3D2E22]">Organization Hierarchy</h3>
        <button 
          onClick={() => setExpandedIds([])}
          className="text-sm text-[#8B7355] hover:text-[#5D4A3A]"
        >
          Collapse All
        </button>
      </div>
      <div className="space-y-2">
        {orgChart.map(node => renderNode(node, 0))}
      </div>
    </div>
  );
};

// Teams Tab Component
const TeamsTab = ({ teams, departments, employees, loading, onEdit, onRefresh }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (teamId) => {
    if (!confirm('Delete this team?')) return;
    setDeleting(teamId);
    try {
      await api.delete(`/hr/teams/${teamId}`);
      toast.success('Team deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-[#E8D5C4]">
        <Users className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#3D2E22]">No teams found</h3>
        <p className="text-[#8B7355]">Create teams within departments to organize employees</p>
      </div>
    );
  }

  // Group teams by department
  const teamsByDept = departments.reduce((acc, dept) => {
    acc[dept.id] = {
      department: dept,
      teams: teams.filter(t => t.department_id === dept.id)
    };
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.values(teamsByDept).filter(g => g.teams.length > 0).map(({ department, teams: deptTeams }) => (
        <div key={department.id} className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
          <div className="px-6 py-4 bg-[#F5EDE4] border-b border-[#E8D5C4]">
            <h3 className="font-semibold text-[#3D2E22]">{department.name}</h3>
            <p className="text-sm text-[#8B7355]">{deptTeams.length} team(s)</p>
          </div>
          <div className="divide-y divide-[#E8D5C4]">
            {deptTeams.map(team => (
              <div key={team.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#F5EDE4]/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#8B7355]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#3D2E22]">{team.name}</p>
                    <p className="text-sm text-[#8B7355]">{team.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#3D2E22]">{team.member_count} members</p>
                    {team.team_lead_name && (
                      <p className="text-xs text-[#8B7355]">Lead: {team.team_lead_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(team)} className="p-1.5 hover:bg-[#F5EDE4] rounded-md">
                      <Edit2 className="w-4 h-4 text-[#8B7355]" />
                    </button>
                    <button 
                      onClick={() => handleDelete(team.id)} 
                      disabled={deleting === team.id || team.member_count > 0}
                      className="p-1.5 hover:bg-red-50 rounded-md disabled:opacity-50"
                    >
                      {deleting === team.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Positions Tab Component
const PositionsTab = ({ positions, departments, loading, onEdit, onRefresh, onSeed }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (posId) => {
    if (!confirm('Delete this position?')) return;
    setDeleting(posId);
    try {
      await api.delete(`/hr/positions/${posId}`);
      toast.success('Position deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
    setDeleting(null);
  };

  const levelColors = {
    ceo: 'bg-red-100 text-red-700',
    vp: 'bg-purple-100 text-purple-700',
    director: 'bg-pink-100 text-pink-700',
    manager: 'bg-blue-100 text-blue-700',
    lead: 'bg-indigo-100 text-indigo-700',
    executive: 'bg-green-100 text-green-700',
    associate: 'bg-stone-100 text-stone-700'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-[#E8D5C4]">
        <Briefcase className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#3D2E22]">No positions found</h3>
        <p className="text-[#8B7355] mb-4">Set up position hierarchy for your organization</p>
        <button
          onClick={onSeed}
          className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
        >
          Seed Default Positions
        </button>
      </div>
    );
  }

  // Group by level
  const levels = ['ceo', 'vp', 'director', 'manager', 'lead', 'executive', 'associate'];
  
  return (
    <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
      <table className="w-full">
        <thead className="bg-[#F5EDE4]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase">Position</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase">Code</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase">Level</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase">Department</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase">Reports To</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase">Employees</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-[#5D4A3A] uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8D5C4]">
          {positions.sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level)).map(pos => (
            <tr key={pos.id} className="hover:bg-[#F5EDE4]/50">
              <td className="px-6 py-4">
                <p className="font-medium text-[#3D2E22]">{pos.title}</p>
                {pos.description && <p className="text-sm text-[#8B7355]">{pos.description}</p>}
              </td>
              <td className="px-6 py-4">
                <span className="font-mono text-sm text-[#5D4A3A]">{pos.code}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full capitalize ${levelColors[pos.level] || levelColors.associate}`}>
                  {pos.level}
                </span>
              </td>
              <td className="px-6 py-4 text-[#5D4A3A]">{pos.department_name || 'All'}</td>
              <td className="px-6 py-4 text-[#5D4A3A]">{pos.reporting_position_title || '-'}</td>
              <td className="px-6 py-4 text-[#5D4A3A]">{pos.employee_count}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onEdit(pos)} className="p-1.5 hover:bg-[#F5EDE4] rounded-md">
                    <Edit2 className="w-4 h-4 text-[#8B7355]" />
                  </button>
                  <button 
                    onClick={() => handleDelete(pos.id)} 
                    disabled={deleting === pos.id || pos.employee_count > 0}
                    className="p-1.5 hover:bg-red-50 rounded-md disabled:opacity-50"
                  >
                    {deleting === pos.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Team Modal
const TeamModal = ({ team, departments, employees, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: team?.name || '',
    code: team?.code || '',
    department_id: team?.department_id || '',
    team_lead_id: team?.team_lead_id || '',
    description: team?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (team) {
        await api.put(`/hr/teams/${team.id}`, form);
        toast.success('Team updated');
      } else {
        await api.post('/hr/teams', form);
        toast.success('Team created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4" data-testid="team-modal">
        <div className="p-6 border-b border-[#E8D5C4]">
          <h2 className="text-lg font-semibold text-[#3D2E22]">{team ? 'Edit Team' : 'Add Team'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Team Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="e.g., social-media"
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              required
              disabled={!!team}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Department *</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              required
            >
              <option value="">Select department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Team Lead</label>
            <select
              value={form.team_lead_id}
              onChange={(e) => setForm({ ...form, team_lead_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
            >
              <option value="">Select team lead...</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8D5C4]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#5D4A3A] hover:bg-[#F5EDE4] rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (team ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Position Modal
const PositionModal = ({ position, departments, positions, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: position?.title || '',
    code: position?.code || '',
    level: position?.level || 'associate',
    department_id: position?.department_id || '',
    reporting_position_id: position?.reporting_position_id || '',
    description: position?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.department_id) delete payload.department_id;
      if (!payload.reporting_position_id) delete payload.reporting_position_id;
      
      if (position) {
        await api.put(`/hr/positions/${position.id}`, payload);
        toast.success('Position updated');
      } else {
        await api.post('/hr/positions', payload);
        toast.success('Position created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  const parentPositions = positions.filter(p => p.id !== position?.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4" data-testid="position-modal">
        <div className="p-6 border-b border-[#E8D5C4]">
          <h2 className="text-lg font-semibold text-[#3D2E22]">{position ? 'Edit Position' : 'Add Position'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Position Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Marketing Head"
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
              placeholder="e.g., MKT-HEAD"
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
              required
              disabled={!!position}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Level *</label>
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
            >
              <option value="ceo">CEO</option>
              <option value="vp">Vice President</option>
              <option value="director">Director</option>
              <option value="manager">Manager</option>
              <option value="lead">Team Lead</option>
              <option value="executive">Executive</option>
              <option value="associate">Associate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Department</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Reports To Position</label>
            <select
              value={form.reporting_position_id}
              onChange={(e) => setForm({ ...form, reporting_position_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg"
            >
              <option value="">None (Top Level)</option>
              {parentPositions.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8D5C4]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#5D4A3A] hover:bg-[#F5EDE4] rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (position ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationStructure;
