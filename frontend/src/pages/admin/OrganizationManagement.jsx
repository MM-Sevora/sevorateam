import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Building2, Users, Shield, Settings, ChevronRight, Plus, Edit2, Trash2,
  Loader2, RefreshCw, Search, UserPlus, GitBranch, Check, X, AlertTriangle,
  MoreVertical, Mail, Phone, Crown, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const OrganizationManagement = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchGrades = async () => {
    try {
      const res = await api.get('/hr/grades');
      setGrades(res.data);
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'departments') {
        const res = await api.get('/workos/departments');
        setDepartments(res.data);
      } else if (activeTab === 'roles') {
        const res = await api.get('/workos/roles');
        setRoles(res.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/workos/users');
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'departments', label: 'Departments', icon: Building2, count: departments.length },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield, count: roles.length },
    { id: 'users', label: 'Team Members', icon: Users, count: users.length },
  ];

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && departments.length === 0 && roles.length === 0 && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="organization-management">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
          <Settings className="w-4 h-4" />
          <span>Admin</span>
          <ChevronRight className="w-4 h-4" />
          <span>Organization</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2E22]">Organization Management</h1>
            <p className="text-[#8B7355] mt-1">Manage departments, roles, and team members</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg border border-[#E8D5C4] hover:bg-[#F5EDE4] transition-colors"
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-5 h-5 text-[#5D4A3A] ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'departments' && (
              <button
                onClick={() => { setEditingItem(null); setShowDeptModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                data-testid="add-department-btn"
              >
                <Plus className="w-4 h-4" />
                Add Department
              </button>
            )}
            {activeTab === 'roles' && (
              <button
                onClick={() => { setEditingItem(null); setShowRoleModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                data-testid="add-role-btn"
              >
                <Plus className="w-4 h-4" />
                Add Role
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
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-white text-[#3D2E22] shadow-sm' 
                : 'text-[#8B7355] hover:text-[#5D4A3A]'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
          data-testid="search-input"
        />
      </div>

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map(dept => (
            <DepartmentCard 
              key={dept.id} 
              department={dept}
              onEdit={() => { setEditingItem(dept); setShowDeptModal(true); }}
              onRefresh={fetchData}
            />
          ))}
          {filteredDepartments.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Building2 className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#3D2E22]">No departments found</h3>
              <p className="text-[#8B7355]">Create your first department to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {filteredRoles.map(role => (
            <RoleCard 
              key={role.id} 
              role={role}
              onEdit={() => { setEditingItem(role); setShowRoleModal(true); }}
              onRefresh={fetchData}
            />
          ))}
          {filteredRoles.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#3D2E22]">No roles found</h3>
              <p className="text-[#8B7355]">Create your first role to define permissions</p>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5EDE4]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Reports To</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#5D4A3A] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D5C4]">
              {filteredUsers.map(user => (
                <UserRow 
                  key={user.id} 
                  user={user}
                  departments={departments}
                  roles={roles}
                  allUsers={users}
                  onEdit={() => { setEditingItem(user); setShowUserModal(true); }}
                  onRefresh={fetchData}
                />
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#3D2E22]">No users found</h3>
              <p className="text-[#8B7355]">Invite team members to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showDeptModal && (
        <DepartmentModal
          department={editingItem}
          onClose={() => setShowDeptModal(false)}
          onSave={() => { setShowDeptModal(false); fetchData(); }}
        />
      )}
      {showRoleModal && (
        <RoleModal
          role={editingItem}
          onClose={() => setShowRoleModal(false)}
          onSave={() => { setShowRoleModal(false); fetchData(); }}
        />
      )}
      {showUserModal && (
        <UserModal
          user={editingItem}
          departments={departments}
          roles={roles}
          grades={grades}
          allUsers={users}
          onClose={() => setShowUserModal(false)}
          onSave={() => { setShowUserModal(false); fetchData(); }}
        />
      )}
    </div>
  );
};

// Department Card Component
const DepartmentCard = ({ department, onEdit, onRefresh }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${department.name}" department?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/workos/departments/${department.id}`);
      toast.success('Department deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
    setDeleting(false);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8D5C4] p-5 hover:shadow-md transition-shadow" data-testid={`dept-card-${department.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${department.color}20` }}>
            <Building2 className="w-5 h-5" style={{ color: department.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-[#3D2E22]">{department.name}</h3>
            <p className="text-sm text-[#8B7355]">{department.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 hover:bg-[#F5EDE4] rounded-md transition-colors">
            <Edit2 className="w-4 h-4 text-[#8B7355]" />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-1.5 hover:bg-red-50 rounded-md transition-colors">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
          </button>
        </div>
      </div>
      
      {department.description && (
        <p className="text-sm text-[#5D4A3A] mb-4">{department.description}</p>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-[#8B7355]">
          <Users className="w-4 h-4" />
          <span>{department.member_count || 0} members</span>
        </div>
        {department.lead_name && (
          <div className="flex items-center gap-1 text-[#8B7355]">
            <Crown className="w-4 h-4" />
            <span>{department.lead_name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Role Card Component
const RoleCard = ({ role, onEdit, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${role.name}" role?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/workos/roles/${role.id}`);
      toast.success('Role deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
    setDeleting(false);
  };

  const permissionCount = Object.values(role.permissions || {}).reduce(
    (acc, dept) => acc + Object.values(dept).reduce((a, acts) => a + acts.length, 0), 0
  );

  return (
    <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden" data-testid={`role-card-${role.id}`}>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#8B7355]/10 rounded-lg">
            <Shield className="w-5 h-5 text-[#8B7355]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#3D2E22]">{role.name}</h3>
              {role.is_system && (
                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">System</span>
              )}
            </div>
            <p className="text-sm text-[#8B7355]">{role.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-[#3D2E22]">Level {role.level}</p>
            <p className="text-xs text-[#8B7355]">{role.user_count || 0} users • {permissionCount} permissions</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-[#F5EDE4] rounded-md transition-colors">
              <Eye className="w-4 h-4 text-[#8B7355]" />
            </button>
            {!role.is_system && (
              <>
                <button onClick={onEdit} className="p-1.5 hover:bg-[#F5EDE4] rounded-md transition-colors">
                  <Edit2 className="w-4 h-4 text-[#8B7355]" />
                </button>
                <button onClick={handleDelete} disabled={deleting} className="p-1.5 hover:bg-red-50 rounded-md transition-colors">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {expanded && role.permissions && (
        <div className="px-5 pb-5 pt-0 border-t border-[#E8D5C4]">
          <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wider mb-3 pt-4">Permissions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(role.permissions).map(([dept, modules]) => (
              <div key={dept} className="bg-[#F5EDE4] rounded-lg p-3">
                <p className="text-sm font-medium text-[#3D2E22] capitalize mb-2">{dept}</p>
                <div className="space-y-1">
                  {Object.entries(modules).map(([mod, actions]) => (
                    <div key={mod} className="flex items-center justify-between text-xs">
                      <span className="text-[#5D4A3A] capitalize">{mod.replace('_', ' ')}</span>
                      <span className="text-[#8B7355]">{actions.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// User Row Component
const UserRow = ({ user, departments, roles, allUsers, onEdit, onRefresh }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-stone-100 text-stone-600',
    pending: 'bg-amber-100 text-amber-700'
  };

  return (
    <tr className="hover:bg-[#F5EDE4]/50" data-testid={`user-row-${user.id}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8B7355]/10 flex items-center justify-center">
            <span className="text-[#8B7355] font-medium">{user.name?.charAt(0) || '?'}</span>
          </div>
          <div>
            <p className="font-medium text-[#3D2E22]">{user.name || 'Unnamed'}</p>
            <p className="text-sm text-[#8B7355]">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-[#5D4A3A]">{user.department_name || '-'}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-[#5D4A3A]">{user.grade_name || '-'}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-[#5D4A3A]">{user.role_name || user.role || '-'}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-[#5D4A3A]">{user.manager_name || '-'}</span>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[user.status] || statusColors.pending}`}>
          {user.status || 'pending'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button onClick={onEdit} className="p-1.5 hover:bg-[#F5EDE4] rounded-md transition-colors">
          <Edit2 className="w-4 h-4 text-[#8B7355]" />
        </button>
      </td>
    </tr>
  );
};

// Department Modal
const DepartmentModal = ({ department, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    color: department?.color || '#8B7355',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (department) {
        await api.put(`/workos/departments/${department.id}`, form);
        toast.success('Department updated');
      } else {
        await api.post('/workos/departments', form);
        toast.success('Department created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4" data-testid="department-modal">
        <div className="p-6 border-b border-[#E8D5C4]">
          <h2 className="text-lg font-semibold text-[#3D2E22]">
            {department ? 'Edit Department' : 'New Department'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              required
              disabled={!!department}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none resize-none"
              rows={3}
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
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#5D4A3A] hover:bg-[#F5EDE4] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (department ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Role Modal (simplified)
const RoleModal = ({ role, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: role?.name || '',
    code: role?.code || '',
    description: role?.description || '',
    level: role?.level || 30,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (role) {
        await api.put(`/workos/roles/${role.id}`, form);
        toast.success('Role updated');
      } else {
        await api.post('/workos/roles', { ...form, permissions: {} });
        toast.success('Role created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4" data-testid="role-modal">
        <div className="p-6 border-b border-[#E8D5C4]">
          <h2 className="text-lg font-semibold text-[#3D2E22]">
            {role ? 'Edit Role' : 'New Role'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              required
              disabled={!!role}
            />
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
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Level (1-100)</label>
            <input
              type="number"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              min="1"
              max="100"
            />
            <p className="text-xs text-[#8B7355] mt-1">Higher level = more access. Super Admin = 100</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#5D4A3A] hover:bg-[#F5EDE4] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (role ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Modal
const UserModal = ({ user, departments, roles, grades, allUsers, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: user?.name || '',
    department_id: user?.department_id || '',
    role_id: user?.role_id || '',
    grade_id: user?.grade_id || '',
    reports_to: user?.reports_to || '',
    title: user?.title || '',
    status: user?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/workos/users/${user.id}`, form);
      toast.success('User updated');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  const managers = allUsers.filter(u => u.id !== user?.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4" data-testid="user-modal">
        <div className="p-6 border-b border-[#E8D5C4]">
          <h2 className="text-lg font-semibold text-[#3D2E22]">Edit User</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
              placeholder="e.g., Marketing Executive"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Department</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
            >
              <option value="">Select department...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Grade</label>
            <select
              value={form.grade_id}
              onChange={(e) => setForm({ ...form, grade_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
            >
              <option value="">Select grade...</option>
              {grades?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Role</label>
            <select
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
            >
              <option value="">Select role...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Reports To</label>
            <select
              value={form.reports_to}
              onChange={(e) => setForm({ ...form, reports_to: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
            >
              <option value="">No manager</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3D2E22] mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8D5C4] rounded-lg focus:ring-2 focus:ring-[#8B7355]/20 focus:border-[#8B7355] outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#5D4A3A] hover:bg-[#F5EDE4] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationManagement;
