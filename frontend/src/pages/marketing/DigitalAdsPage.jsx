import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { 
  Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, 
  TrendingUp, DollarSign, MousePointer, Users, Target, 
  Play, Pause, Archive, RefreshCw, ExternalLink, Settings,
  BarChart3, PieChart, Activity, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Platform icons/colors
const PLATFORM_CONFIG = {
  meta: { label: 'Meta (FB/IG)', color: 'bg-blue-500', icon: '📘' },
  google: { label: 'Google Ads', color: 'bg-red-500', icon: '🔍' },
  youtube: { label: 'YouTube', color: 'bg-red-600', icon: '📺' },
  tiktok: { label: 'TikTok', color: 'bg-pink-500', icon: '🎵' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-700', icon: '💼' },
  twitter: { label: 'Twitter/X', color: 'bg-gray-800', icon: '🐦' }
};

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  paused: { label: 'Paused', color: 'bg-yellow-500' },
  completed: { label: 'Completed', color: 'bg-blue-500' },
  archived: { label: 'Archived', color: 'bg-gray-400' },
  pending_review: { label: 'Pending Review', color: 'bg-orange-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' }
};

const OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'reach', label: 'Reach' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'app_installs', label: 'App Installs' },
  { value: 'video_views', label: 'Video Views' },
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'catalog_sales', label: 'Catalog Sales' },
  { value: 'store_traffic', label: 'Store Traffic' }
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default function DigitalAdsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [adSets, setAdSets] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Dialog states
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, accountsRes, campaignsRes] = await Promise.all([
        fetch(`${API_URL}/api/marketing/v3/ads/overview/stats`),
        fetch(`${API_URL}/api/marketing/v3/ads/accounts`),
        fetch(`${API_URL}/api/marketing/v3/ads/campaigns`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (accountsRes.ok) setAccounts(await accountsRes.json());
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load ads data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/ads/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Ad account created successfully');
        setShowAccountDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create account');
      }
    } catch (error) {
      toast.error('Failed to create account');
    }
  };

  const handleCreateCampaign = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/ads/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Campaign created successfully');
        setShowCampaignDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create campaign');
      }
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const handleUpdateCampaignStatus = async (campaignId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('Campaign status updated');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update campaign');
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || campaign.platform === selectedPlatform;
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6" data-testid="digital-ads-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Ads Management</h1>
          <p className="text-gray-500">Manage your paid advertising campaigns across platforms</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCampaignDialog(true)} data-testid="create-campaign-btn">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Campaigns</p>
                  <p className="text-2xl font-bold">{stats.total_campaigns}</p>
                  <p className="text-xs text-green-600">{stats.active_campaigns} active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Spend</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.total_spend)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Impressions</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.total_impressions)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MousePointer className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Clicks</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.total_clicks)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Activity className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg. CTR</p>
                  <p className="text-2xl font-bold">{stats.avg_ctr.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Zap className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Conversions</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.total_conversions)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="accounts">Ad Accounts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No campaigns yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => setShowCampaignDialog(true)}
                    >
                      Create your first campaign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.slice(0, 5).map(campaign => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{PLATFORM_CONFIG[campaign.platform]?.icon}</span>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-gray-500">{PLATFORM_CONFIG[campaign.platform]?.label}</p>
                          </div>
                        </div>
                        <Badge className={STATUS_CONFIG[campaign.status]?.color}>
                          {STATUS_CONFIG[campaign.status]?.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connected Accounts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Ad Accounts</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowAccountDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No ad accounts connected</p>
                    <p className="text-sm mt-1">Connect your ad platform accounts to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map(account => (
                      <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{PLATFORM_CONFIG[account.platform]?.icon}</span>
                          <div>
                            <p className="font-medium">{account.account_name}</p>
                            <p className="text-sm text-gray-500">ID: {account.account_id}</p>
                          </div>
                        </div>
                        <Badge className={STATUS_CONFIG[account.status]?.color}>
                          {STATUS_CONFIG[account.status]?.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="campaign-search"
              />
            </div>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Campaign</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Platform</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Budget</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Spend</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Impressions</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Clicks</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No campaigns found
                        </td>
                      </tr>
                    ) : (
                      filteredCampaigns.map(campaign => (
                        <tr key={campaign.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-sm text-gray-500">{campaign.objective}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{PLATFORM_CONFIG[campaign.platform]?.icon}</span>
                              <span className="text-sm">{PLATFORM_CONFIG[campaign.platform]?.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={STATUS_CONFIG[campaign.status]?.color}>
                              {STATUS_CONFIG[campaign.status]?.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(campaign.budget)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(campaign.total_spend || 0)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(campaign.total_impressions || 0)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(campaign.total_clicks || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              {campaign.status === 'active' ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleUpdateCampaignStatus(campaign.id, 'paused')}
                                >
                                  <Pause className="w-4 h-4" />
                                </Button>
                              ) : campaign.status === 'paused' ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleUpdateCampaignStatus(campaign.id, 'active')}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500">Connect and manage your ad platform accounts</p>
            <Button onClick={() => setShowAccountDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(account => (
              <Card key={account.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg ${PLATFORM_CONFIG[account.platform]?.color} flex items-center justify-center text-2xl`}>
                        {PLATFORM_CONFIG[account.platform]?.icon}
                      </div>
                      <div>
                        <p className="font-medium">{account.account_name}</p>
                        <p className="text-sm text-gray-500">{PLATFORM_CONFIG[account.platform]?.label}</p>
                        <p className="text-xs text-gray-400 mt-1">ID: {account.account_id}</p>
                      </div>
                    </div>
                    <Badge className={STATUS_CONFIG[account.status]?.color}>
                      {STATUS_CONFIG[account.status]?.label}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="w-4 h-4 mr-1" />
                      Settings
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Account Card */}
            <Card 
              className="border-dashed cursor-pointer hover:border-primary transition-colors"
              onClick={() => setShowAccountDialog(true)}
            >
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full min-h-[180px] text-gray-400">
                <Plus className="w-10 h-10 mb-2" />
                <p>Add Ad Account</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Connect ad accounts and create campaigns to see detailed performance analytics, 
                charts, and insights.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ad Account</DialogTitle>
            <DialogDescription>Connect a new ad platform account</DialogDescription>
          </DialogHeader>
          <CreateAccountForm 
            onSubmit={handleCreateAccount} 
            onCancel={() => setShowAccountDialog(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Ad Campaign</DialogTitle>
            <DialogDescription>Set up a new advertising campaign</DialogDescription>
          </DialogHeader>
          <CreateCampaignForm 
            accounts={accounts}
            onSubmit={handleCreateCampaign} 
            onCancel={() => setShowCampaignDialog(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Account Form Component
function CreateAccountForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    platform: '',
    account_name: '',
    account_id: '',
    currency: 'INR',
    status: 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.platform || !formData.account_name || !formData.account_id) {
      toast.error('Please fill all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Platform *</Label>
        <Select value={formData.platform} onValueChange={(v) => setFormData({...formData, platform: v})}>
          <SelectTrigger>
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  {config.icon} {config.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Account Name *</Label>
        <Input
          value={formData.account_name}
          onChange={(e) => setFormData({...formData, account_name: e.target.value})}
          placeholder="e.g., Sevora Main Account"
        />
      </div>

      <div className="space-y-2">
        <Label>Account ID *</Label>
        <Input
          value={formData.account_id}
          onChange={(e) => setFormData({...formData, account_id: e.target.value})}
          placeholder="e.g., act_123456789"
        />
      </div>

      <div className="space-y-2">
        <Label>Currency</Label>
        <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add Account</Button>
      </DialogFooter>
    </form>
  );
}

// Create Campaign Form Component
function CreateCampaignForm({ accounts, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    account_id: '',
    objective: 'traffic',
    campaign_type: 'performance',
    budget: '',
    budget_type: 'daily',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.platform || !formData.account_id || !formData.budget) {
      toast.error('Please fill all required fields');
      return;
    }
    onSubmit({
      ...formData,
      budget: parseFloat(formData.budget)
    });
  };

  // Filter accounts by selected platform
  const filteredAccounts = formData.platform 
    ? accounts.filter(a => a.platform === formData.platform)
    : accounts;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Campaign Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Summer Sale 2026"
          />
        </div>

        <div className="space-y-2">
          <Label>Platform *</Label>
          <Select 
            value={formData.platform} 
            onValueChange={(v) => setFormData({...formData, platform: v, account_id: ''})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    {config.icon} {config.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ad Account *</Label>
          <Select 
            value={formData.account_id} 
            onValueChange={(v) => setFormData({...formData, account_id: v})}
            disabled={!formData.platform}
          >
            <SelectTrigger>
              <SelectValue placeholder={formData.platform ? "Select account" : "Select platform first"} />
            </SelectTrigger>
            <SelectContent>
              {filteredAccounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.account_name}
                </SelectItem>
              ))}
              {filteredAccounts.length === 0 && formData.platform && (
                <div className="px-2 py-3 text-sm text-gray-500">
                  No accounts for this platform
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Objective *</Label>
          <Select value={formData.objective} onValueChange={(v) => setFormData({...formData, objective: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Budget (INR) *</Label>
          <Input
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({...formData, budget: e.target.value})}
            placeholder="e.g., 10000"
          />
        </div>

        <div className="space-y-2">
          <Label>Budget Type</Label>
          <Select value={formData.budget_type} onValueChange={(v) => setFormData({...formData, budget_type: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Budget</SelectItem>
              <SelectItem value="lifetime">Lifetime Budget</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Campaign notes or description..."
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Campaign</Button>
      </DialogFooter>
    </form>
  );
}
