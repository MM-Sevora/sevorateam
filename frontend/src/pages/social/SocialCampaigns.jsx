import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  Target, Plus, Search, Calendar, Users, MoreVertical, Edit2, Trash2,
  Copy, Eye, Play, Pause, CheckCircle, Clock, FileText, TrendingUp,
  Hash, Loader2, FolderOpen, Link2
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { format } from 'date-fns';

const platforms = [
  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0077B5' },
  { key: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { key: 'twitter', label: 'X/Twitter', icon: FaTwitter, color: '#1DA1F2' },
  { key: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000' },
];

const objectives = [
  { value: 'awareness', label: 'Brand Awareness', icon: Eye },
  { value: 'engagement', label: 'Engagement', icon: TrendingUp },
  { value: 'traffic', label: 'Website Traffic', icon: Link2 },
  { value: 'conversions', label: 'Conversions', icon: Target },
];

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
};

const campaignColors = [
  '#E11D48', '#DB2777', '#C026D3', '#9333EA', '#7C3AED',
  '#6366F1', '#3B82F6', '#0EA5E9', '#14B8A6', '#10B981',
  '#84CC16', '#EAB308', '#F97316', '#EF4444'
];

export default function SocialCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objective: 'awareness',
    start_date: '',
    end_date: '',
    platforms: [],
    status: 'draft',
    owner_id: '',
    budget: '',
    target_audience: '',
    hashtags: '',
    color: '#E11D48'
  });

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
    fetchUsers();
  }, [filterStatus, filterPlatform]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      let url = '/api/social/campaigns';
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPlatform) params.append('platform', filterPlatform);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await api.get(url);
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/social/campaigns/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data.filter(u => u.status === 'active'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Start and end dates are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        hashtags: formData.hashtags ? formData.hashtags.split(',').map(h => h.trim()).filter(Boolean) : [],
      };

      if (editingCampaign) {
        await api.put(`/api/social/campaigns/${editingCampaign.id}`, payload);
        toast.success('Campaign updated');
      } else {
        await api.post('/api/social/campaigns', payload);
        toast.success('Campaign created');
      }
      
      setShowModal(false);
      resetForm();
      fetchCampaigns();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      objective: campaign.objective || 'awareness',
      start_date: campaign.start_date?.split('T')[0] || '',
      end_date: campaign.end_date?.split('T')[0] || '',
      platforms: campaign.platforms || [],
      status: campaign.status,
      owner_id: campaign.owner_id || '',
      budget: campaign.budget?.toString() || '',
      target_audience: campaign.target_audience || '',
      hashtags: campaign.hashtags?.join(', ') || '',
      color: campaign.color || '#E11D48'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign? Posts will be unlinked.')) return;
    try {
      await api.delete(`/api/social/campaigns/${id}`);
      toast.success('Campaign deleted');
      fetchCampaigns();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/api/social/campaigns/${id}/duplicate`);
      toast.success('Campaign duplicated');
      fetchCampaigns();
      fetchStats();
    } catch (err) {
      toast.error('Failed to duplicate campaign');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/api/social/campaigns/${id}`, { status: newStatus });
      toast.success(`Campaign ${newStatus}`);
      fetchCampaigns();
      fetchStats();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setFormData({
      name: '',
      description: '',
      objective: 'awareness',
      start_date: '',
      end_date: '',
      platforms: [],
      status: 'draft',
      owner_id: '',
      budget: '',
      target_audience: '',
      hashtags: '',
      color: '#E11D48'
    });
  };

  const togglePlatform = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#FAF7F5] min-h-screen" data-testid="social-campaigns-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Social Campaigns</h1>
          <p className="text-sm text-[#5D4A3A] mt-1">Plan and manage your social media campaigns</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white" data-testid="create-campaign-btn">
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#5D4A3A]">Total</p>
                <p className="text-2xl font-bold text-[#4A3728]">{stats.total || 0}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-[#D4BBA6]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#5D4A3A]">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
              </div>
              <Play className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#5D4A3A]">Draft</p>
                <p className="text-2xl font-bold text-gray-600">{stats.draft || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#5D4A3A]">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#5D4A3A]">Linked Posts</p>
                <p className="text-2xl font-bold text-[#4A3728]">{stats.total_linked_posts || 0}</p>
              </div>
              <Link2 className="w-8 h-8 text-[#D4BBA6]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4A3A]" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-[#E8D5C4]"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-white border-[#E8D5C4]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-40 bg-white border-[#E8D5C4]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Platforms</SelectItem>
            {platforms.map(p => (
              <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4BBA6]" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="py-20 text-center">
            <Target className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No campaigns yet</h3>
            <p className="text-sm text-[#5D4A3A] mb-4">Create your first campaign to start planning</p>
            <Button onClick={() => setShowModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              <Plus className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="bg-white border-[#E8D5C4] hover:border-[#D4BBA6] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Color bar */}
                  <div className="w-1.5 h-full min-h-[80px] rounded-full" style={{ backgroundColor: campaign.color || '#E11D48' }} />
                  
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-[#4A3728] text-lg">{campaign.name}</h3>
                        {campaign.description && (
                          <p className="text-sm text-[#5D4A3A] mt-1 line-clamp-1">{campaign.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[campaign.status]}>
                          {campaign.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/social/campaigns/${campaign.id}`)}>
                              <Eye className="w-4 h-4 mr-2" /> View Posts
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(campaign.id)}>
                              <Copy className="w-4 h-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            {campaign.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'active')}>
                                <Play className="w-4 h-4 mr-2" /> Activate
                              </DropdownMenuItem>
                            )}
                            {campaign.status === 'active' && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'paused')}>
                                  <Pause className="w-4 h-4 mr-2" /> Pause
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'completed')}>
                                  <CheckCircle className="w-4 h-4 mr-2" /> Complete
                                </DropdownMenuItem>
                              </>
                            )}
                            {campaign.status === 'paused' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'active')}>
                                <Play className="w-4 h-4 mr-2" /> Resume
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(campaign.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#5D4A3A]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(campaign.start_date), 'MMM d')} - {format(new Date(campaign.end_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        {objectives.find(o => o.value === campaign.objective)?.label || campaign.objective}
                      </span>
                      {campaign.owner_name && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {campaign.owner_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {campaign.post_count} posts
                      </span>
                    </div>

                    {/* Platforms */}
                    <div className="flex items-center gap-2 mt-3">
                      {campaign.platforms?.map(p => {
                        const platform = platforms.find(x => x.key === p);
                        if (!platform) return null;
                        const Icon = platform.icon;
                        return (
                          <div key={p} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center" title={platform.label}>
                            <Icon className="w-3.5 h-3.5" style={{ color: platform.color }} />
                          </div>
                        );
                      })}
                      {campaign.hashtags?.length > 0 && (
                        <div className="flex items-center gap-1 ml-2 text-xs text-[#5D4A3A]">
                          <Hash className="w-3.5 h-3.5" />
                          {campaign.hashtags.slice(0, 3).join(', ')}
                          {campaign.hashtags.length > 3 && ` +${campaign.hashtags.length - 3}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <Label>Campaign Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Summer Sale 2024"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the campaign..."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Objective */}
            <div>
              <Label>Campaign Objective</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {objectives.map(obj => {
                  const Icon = obj.icon;
                  return (
                    <button
                      key={obj.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, objective: obj.value }))}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.objective === obj.value
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-[#E8D5C4] hover:border-[#D4BBA6] text-[#5D4A3A]'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">{obj.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platforms */}
            <div>
              <Label>Target Platforms</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {platforms.map(p => {
                  const Icon = p.icon;
                  const isSelected = formData.platforms.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePlatform(p.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-[#E8D5C4] hover:border-[#D4BBA6]'
                      }`}
                    >
                      <Icon className="w-4 h-4" style={{ color: isSelected ? p.color : '#9ca3af' }} />
                      <span className={`text-sm ${isSelected ? 'text-rose-700' : 'text-[#5D4A3A]'}`}>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Owner & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Owner</Label>
                <Select value={formData.owner_id} onValueChange={(v) => setFormData(prev => ({ ...prev, owner_id: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget & Target Audience */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget (Optional)</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="e.g., 5000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Target Audience</Label>
                <Input
                  value={formData.target_audience}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="e.g., Women 25-34"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <Label>Campaign Hashtags</Label>
              <Input
                value={formData.hashtags}
                onChange={(e) => setFormData(prev => ({ ...prev, hashtags: e.target.value }))}
                placeholder="e.g., #SummerSale, #ShopNow"
                className="mt-1"
              />
              <p className="text-xs text-[#5D4A3A] mt-1">Separate hashtags with commas</p>
            </div>

            {/* Color */}
            <div>
              <Label>Campaign Color</Label>
              <div className="flex gap-2 mt-2">
                {campaignColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
