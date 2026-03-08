import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { usePermissions } from '../../context/PermissionContext';
import { 
  Users, TrendingUp, Target, GitBranch, ChevronRight, RefreshCw,
  Loader2, User, Mail, Phone, BarChart3, DollarSign, Calendar,
  Eye, ArrowUpRight, Crown, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const TeamDashboard = () => {
  const { isManager, roleLevel, loading: permLoading } = usePermissions();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [loadingMember, setLoadingMember] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workos/team/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      toast.error('Failed to load team dashboard');
    }
    setLoading(false);
  };

  const fetchMemberDetails = async (memberId) => {
    setLoadingMember(true);
    try {
      const res = await api.get(`/workos/team/member/${memberId}/pipeline`);
      setMemberDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch member details:', err);
      toast.error('Failed to load member details');
    }
    setLoadingMember(false);
  };

  const handleMemberClick = (member) => {
    setSelectedMember(member);
    fetchMemberDetails(member.id);
  };

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (!data?.is_manager) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16 bg-white rounded-xl border border-[#E8D5C4]">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#3D2E22] mb-2">Manager Access Required</h2>
          <p className="text-[#8B7355] max-w-md mx-auto">
            The Team Dashboard is available for managers and above. 
            Contact your administrator if you believe you should have access.
          </p>
        </div>
      </div>
    );
  }

  const stats = data.team_stats || {};
  const stageColors = {
    identified: 'bg-stone-100 text-stone-600',
    contacted: 'bg-blue-100 text-blue-600',
    replied: 'bg-cyan-100 text-cyan-600',
    negotiating: 'bg-amber-100 text-amber-600',
    agreed: 'bg-green-100 text-green-600',
    delivered: 'bg-emerald-100 text-emerald-600',
    lost: 'bg-red-100 text-red-600'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="team-dashboard">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[#8B7355] mb-2">
          <Users className="w-4 h-4" />
          <span>Team</span>
          <ChevronRight className="w-4 h-4" />
          <span>Dashboard</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3D2E22]">Team Dashboard</h1>
            <p className="text-[#8B7355] mt-1">Monitor your team's pipeline performance and activities</p>
          </div>
          <button
            onClick={fetchTeamData}
            className="flex items-center gap-2 px-4 py-2 border border-[#E8D5C4] rounded-lg hover:bg-[#F5EDE4] transition-colors"
            data-testid="refresh-team-btn"
          >
            <RefreshCw className={`w-4 h-4 text-[#5D4A3A] ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Team Size"
          value={data.team_size || 0}
          color="bg-[#8B7355]"
        />
        <StatCard
          icon={Target}
          label="Total Contacts"
          value={stats.total_contacts || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={DollarSign}
          label="Pipeline Value"
          value={`₹${((stats.total_deals_value || 0) / 100000).toFixed(1)}L`}
          color="bg-green-500"
        />
        <StatCard
          icon={BarChart3}
          label="Avg per Member"
          value={stats.avg_contacts_per_member || 0}
          color="bg-purple-500"
        />
      </div>

      {/* Pipeline Stage Breakdown */}
      <div className="bg-white rounded-xl border border-[#E8D5C4] p-6 mb-8">
        <h2 className="text-lg font-semibold text-[#3D2E22] mb-4">Team Pipeline Overview</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.stage_breakdown || {}).map(([stage, count]) => (
            <div key={stage} className={`px-4 py-2 rounded-lg ${stageColors[stage] || 'bg-stone-100 text-stone-600'}`}>
              <span className="font-medium capitalize">{stage.replace('_', ' ')}</span>
              <span className="ml-2 font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE4] to-white">
              <h2 className="font-semibold text-[#3D2E22]">Team Members</h2>
            </div>
            <div className="divide-y divide-[#E8D5C4]">
              {data.team_members?.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#3D2E22]">No team members yet</h3>
                  <p className="text-[#8B7355]">Assign users to report to you in the Organization settings</p>
                </div>
              ) : (
                data.team_members?.map(member => (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedMember?.id === member.id 
                        ? 'bg-[#F5EDE4]' 
                        : 'hover:bg-[#F5EDE4]/50'
                    }`}
                    data-testid={`team-member-${member.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#8B7355]/10 flex items-center justify-center">
                          <span className="text-[#8B7355] font-medium">
                            {member.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#3D2E22]">{member.name}</p>
                          <p className="text-sm text-[#8B7355]">{member.title || member.role_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#3D2E22]">{member.contact_count} contacts</p>
                        <p className="text-sm text-green-600">₹{((member.deals_value || 0) / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                    
                    {/* Mini pipeline preview */}
                    <div className="mt-3 flex gap-1">
                      {Object.entries(member.stage_breakdown || {}).map(([stage, count]) => (
                        count > 0 && (
                          <div
                            key={stage}
                            className={`px-2 py-0.5 text-xs rounded ${stageColors[stage] || 'bg-stone-100'}`}
                            title={`${stage}: ${count}`}
                          >
                            {count}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Member Details Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-[#E8D5C4] overflow-hidden sticky top-6">
            <div className="px-6 py-4 border-b border-[#E8D5C4] bg-gradient-to-r from-[#F5EDE4] to-white">
              <h2 className="font-semibold text-[#3D2E22]">
                {selectedMember ? selectedMember.name : 'Select a Team Member'}
              </h2>
            </div>
            
            {!selectedMember ? (
              <div className="p-8 text-center">
                <User className="w-12 h-12 text-[#C4B5A5] mx-auto mb-4" />
                <p className="text-[#8B7355]">Click on a team member to view their details</p>
              </div>
            ) : loadingMember ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
              </div>
            ) : memberDetails ? (
              <div className="p-4 space-y-4">
                {/* Member Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#8B7355]/10 flex items-center justify-center">
                    <span className="text-[#8B7355] font-medium text-lg">
                      {selectedMember.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[#3D2E22]">{selectedMember.name}</p>
                    <p className="text-sm text-[#8B7355]">{selectedMember.email}</p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F5EDE4] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#3D2E22]">{memberDetails.contacts?.length || 0}</p>
                    <p className="text-xs text-[#8B7355]">Contacts</p>
                  </div>
                  <div className="bg-[#F5EDE4] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#3D2E22]">{memberDetails.deals?.length || 0}</p>
                    <p className="text-xs text-[#8B7355]">Deals</p>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div>
                  <p className="text-sm font-semibold text-[#8B7355] mb-2">Recent Communications</p>
                  {memberDetails.recent_communications?.length === 0 ? (
                    <p className="text-sm text-[#8B7355]">No recent activity</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {memberDetails.recent_communications?.slice(0, 5).map((comm, idx) => (
                        <div key={idx} className="text-sm p-2 bg-[#F5EDE4] rounded-lg">
                          <p className="font-medium text-[#3D2E22] truncate">{comm.subject || 'Communication'}</p>
                          <p className="text-xs text-[#8B7355]">
                            {new Date(comm.sent_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* View Full Pipeline Button */}
                <a
                  href={`/marketing/pipeline?assigned_to=${selectedMember.id}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#8B7355] text-white rounded-lg hover:bg-[#6B5A45] transition-colors"
                >
                  View Full Pipeline
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-[#E8D5C4] p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg ${color}/10`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-[#3D2E22]">{value}</p>
    <p className="text-sm text-[#8B7355]">{label}</p>
  </div>
);

export default TeamDashboard;
