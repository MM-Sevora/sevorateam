import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft, RefreshCw, Calendar, DollarSign, Users, FileText,
  Megaphone, Image, Building2, TrendingUp, Clock, CheckCircle,
  AlertTriangle, Target, ExternalLink, Eye, Edit, Plus, BarChart3
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  paused: { label: 'Paused', color: 'bg-yellow-500' },
  completed: { label: 'Completed', color: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' },
};

const CAMPAIGN_TYPE_CONFIG = {
  influencer: { label: 'Influencer', icon: Users, tabs: ['content', 'ads', 'assets', 'influencers', 'budget'] },
  pr: { label: 'PR', icon: Building2, tabs: ['content', 'assets', 'publications', 'budget'] },
  mixed: { label: 'Mixed', icon: Target, tabs: ['content', 'ads', 'assets', 'influencers', 'publications', 'budget'] },
  digital: { label: 'Digital', icon: Megaphone, tabs: ['content', 'ads', 'assets', 'budget'] },
};

const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function CampaignDetailsPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState('content');

  // Related data
  const [contentProjects, setContentProjects] = useState([]);
  const [adCampaigns, setAdCampaigns] = useState([]);
  const [assets, setAssets] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [publications, setPublications] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState(null);

  const fetchCampaignData = useCallback(async () => {
    if (!campaignId) return;
    
    setLoading(true);
    try {
      let campaignData = null;
      
      // Try regular campaigns endpoint first
      try {
        const campaignRes = await fetch(`${API_URL}/api/marketing/campaigns/${campaignId}`);
        if (campaignRes.ok) {
          campaignData = await campaignRes.json();
          campaignData.campaign_source = 'influencer';
        }
      } catch (e) {
        // Ignore and try next endpoint
      }
      
      // Try PR campaigns endpoint if not found
      if (!campaignData) {
        try {
          const prRes = await fetch(`${API_URL}/api/marketing/v2/pr/campaigns/${campaignId}`);
          if (prRes.ok) {
            campaignData = await prRes.json();
            campaignData.type = 'pr';
            campaignData.campaign_source = 'pr';
          }
        } catch (e) {
          // Ignore
        }
      }
      
      if (!campaignData) {
        toast.error('Campaign not found');
        navigate('/marketing/campaigns');
        return;
      }
      
      setCampaign(campaignData);

      // Fetch related content projects
      try {
        const contentRes = await fetch(`${API_URL}/api/marketing/v3/content/projects?campaign_id=${campaignId}&limit=50`);
        if (contentRes.ok) {
          setContentProjects(await contentRes.json());
        }
      } catch (e) {}

      // Fetch related ad campaigns
      try {
        const adsRes = await fetch(`${API_URL}/api/marketing/v3/ads/campaigns?marketing_campaign_id=${campaignId}`);
        if (adsRes.ok) {
          setAdCampaigns(await adsRes.json());
        }
      } catch (e) {}

      // Fetch influencer deals for this campaign
      try {
        const influencerRes = await fetch(`${API_URL}/api/marketing/v2/deals?campaign_id=${campaignId}&limit=50`);
        if (influencerRes.ok) {
          const dealsData = await influencerRes.json();
          setInfluencers(dealsData.deals || dealsData || []);
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast.error('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  }, [campaignId, navigate]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center text-gray-500">
        Campaign not found
      </div>
    );
  }

  const campaignType = campaign.type || 'mixed';
  const typeConfig = CAMPAIGN_TYPE_CONFIG[campaignType] || CAMPAIGN_TYPE_CONFIG.mixed;
  const availableTabs = typeConfig.tabs;

  // Calculate budget utilization
  const totalBudget = campaign.budget || 0;
  const spentBudget = campaign.total_spent || campaign.spent || 0;
  const budgetUtilization = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;

  return (
    <div className="p-6 space-y-6" data-testid="campaign-details-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/marketing/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge className={STATUS_CONFIG[campaign.status]?.color}>
                {STATUS_CONFIG[campaign.status]?.label || campaign.status}
              </Badge>
              <Badge variant="outline">{typeConfig.label} Campaign</Badge>
            </div>
            {campaign.description && (
              <p className="text-gray-500 mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaignData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Campaign
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-medium">
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-sm font-medium">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Spent</p>
                <p className="text-sm font-medium">{formatCurrency(spentBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Utilization</p>
                <p className="text-sm font-medium">{budgetUtilization.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-xs text-gray-500">Content</p>
                <p className="text-sm font-medium">{contentProjects.length} Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-xs text-gray-500">Influencers</p>
                <p className="text-sm font-medium">{influencers.length} Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {totalBudget > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget Utilization</span>
              <span className={`text-sm ${budgetUtilization > 90 ? 'text-red-500' : 'text-gray-500'}`}>
                {formatCurrency(spentBudget)} / {formatCurrency(totalBudget)}
              </span>
            </div>
            <Progress 
              value={Math.min(budgetUtilization, 100)} 
              className={`h-3 ${budgetUtilization > 100 ? 'bg-red-100' : ''}`}
            />
            {budgetUtilization > 90 && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Budget is {budgetUtilization > 100 ? 'exceeded' : 'almost exhausted'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs - Only show relevant tabs based on campaign type */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {availableTabs.includes('content') && (
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Content ({contentProjects.length})
            </TabsTrigger>
          )}
          {availableTabs.includes('ads') && (
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Ads ({adCampaigns.length})
            </TabsTrigger>
          )}
          {availableTabs.includes('assets') && (
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Assets ({assets.length})
            </TabsTrigger>
          )}
          {availableTabs.includes('influencers') && (
            <TabsTrigger value="influencers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Influencers ({influencers.length})
            </TabsTrigger>
          )}
          {availableTabs.includes('publications') && (
            <TabsTrigger value="publications" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Publications ({publications.length})
            </TabsTrigger>
          )}
          {availableTabs.includes('budget') && (
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget
            </TabsTrigger>
          )}
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Content Projects</CardTitle>
              <Button size="sm" onClick={() => navigate('/marketing/content')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </CardHeader>
            <CardContent>
              {contentProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No content projects linked to this campaign
                </div>
              ) : (
                <div className="space-y-3">
                  {contentProjects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {project.content_category || project.content_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {project.medium || project.platform}
                          </Badge>
                          <Badge className={
                            project.status === 'published' ? 'bg-green-500' :
                            project.status === 'in_production' ? 'bg-blue-500' : 'bg-gray-500'
                          }>
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Digital Ad Campaigns</CardTitle>
              <Button size="sm" onClick={() => navigate('/marketing/ads')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Ad Campaign
              </Button>
            </CardHeader>
            <CardContent>
              {adCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No ad campaigns linked to this marketing campaign
                </div>
              ) : (
                <div className="space-y-3">
                  {adCampaigns.map(ad => (
                    <div key={ad.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{ad.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{ad.platform}</Badge>
                          <span className="text-sm text-gray-500">
                            Budget: {formatCurrency(ad.budget)}
                          </span>
                          <Badge className={ad.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {ad.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Creative Assets</CardTitle>
              <Button size="sm" onClick={() => navigate('/marketing/assets')}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Asset
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                No assets linked to this campaign yet
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Influencers Tab */}
        <TabsContent value="influencers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Influencer Deals</CardTitle>
              <Button size="sm" onClick={() => navigate('/marketing/pipeline')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Influencer
              </Button>
            </CardHeader>
            <CardContent>
              {influencers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No influencer deals linked to this campaign
                </div>
              ) : (
                <div className="space-y-3">
                  {influencers.map(deal => (
                    <div key={deal.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{deal.influencer_name || deal.influencer?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">
                              {formatCurrency(deal.agreed_rate || deal.rate)}
                            </span>
                            <Badge className={
                              deal.status === 'contracted' ? 'bg-green-500' :
                              deal.status === 'negotiating' ? 'bg-yellow-500' : 'bg-gray-500'
                            }>
                              {deal.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Publications Tab */}
        <TabsContent value="publications" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">PR Pitches</CardTitle>
              <Button size="sm" onClick={() => navigate('/marketing/publications/pipeline')}>
                <Plus className="w-4 h-4 mr-2" />
                New Pitch
              </Button>
            </CardHeader>
            <CardContent>
              {publications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No PR pitches linked to this campaign
                </div>
              ) : (
                <div className="space-y-3">
                  {publications.map(pitch => (
                    <div key={pitch.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{pitch.subject}</p>
                        <p className="text-sm text-gray-500">{pitch.publication_name}</p>
                      </div>
                      <Badge>{pitch.stage}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Budget</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-500">Spent</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(spentBudget)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalBudget - spentBudget)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Spending by Category</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Influencer Fees</span>
                      <span className="text-sm font-medium">{formatCurrency(campaign.influencer_spend || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ad Spend</span>
                      <span className="text-sm font-medium">{formatCurrency(campaign.ad_spend || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Production</span>
                      <span className="text-sm font-medium">{formatCurrency(campaign.production_spend || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Other</span>
                      <span className="text-sm font-medium">{formatCurrency(campaign.other_spend || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button variant="outline" onClick={() => navigate('/marketing/budget-management')}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Go to Budget Management
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
