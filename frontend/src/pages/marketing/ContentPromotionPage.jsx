import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  Plus, Search, TrendingUp, DollarSign, Eye, MousePointer,
  Users, Zap, Play, Pause, ExternalLink, RefreshCw, Megaphone,
  Instagram, Youtube, CheckCircle, XCircle, Clock, Link
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-500' },
  approved: { label: 'Approved', color: 'bg-blue-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  paused: { label: 'Paused', color: 'bg-orange-500' },
  completed: { label: 'Completed', color: 'bg-purple-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' },
};

const PROMOTION_TYPES = [
  { value: 'boosted_post', label: 'Boosted Post' },
  { value: 'spark_ad', label: 'Spark Ad (TikTok)' },
  { value: 'branded_content', label: 'Branded Content' },
  { value: 'whitelisted_ad', label: 'Whitelisted Ad' },
  { value: 'dark_post', label: 'Dark Post' },
  { value: 'partnership_ad', label: 'Partnership Ad' },
];

const CONTENT_SOURCES = [
  { value: 'influencer_post', label: 'Influencer Post' },
  { value: 'ugc', label: 'User Generated Content' },
  { value: 'brand_collab', label: 'Brand Collaboration' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'review', label: 'Review' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'tiktok', label: 'TikTok' },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default function ContentPromotionPage() {
  const [promotions, setPromotions] = useState([]);
  const [stats, setStats] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Dialog states
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [promotionsRes, statsRes, influencersRes] = await Promise.all([
        fetch(`${API_URL}/api/marketing/v3/content-promotion/promotions`),
        fetch(`${API_URL}/api/marketing/v3/content-promotion/stats`),
        fetch(`${API_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=100`)
      ]);

      if (promotionsRes.ok) setPromotions(await promotionsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (influencersRes.ok) {
        const data = await influencersRes.json();
        setInfluencers(data.contacts || data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load promotions data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/content-promotion/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Promotion created successfully');
        setShowPromotionDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create promotion');
      }
    } catch (error) {
      toast.error('Failed to create promotion');
    }
  };

  const handleUpdateStatus = async (promotionId, newStatus) => {
    try {
      const response = await fetch(
        `${API_URL}/api/marketing/v3/content-promotion/promotions/${promotionId}/status?status=${newStatus}`,
        { method: 'PUT' }
      );

      if (response.ok) {
        toast.success('Status updated');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         promo.influencer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || promo.status === selectedStatus;
    const matchesPlatform = selectedPlatform === 'all' || promo.platform === selectedPlatform;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  return (
    <div className="p-6 space-y-6" data-testid="content-promotion-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Promotion</h1>
          <p className="text-gray-500">Promote influencer content as paid ads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowPromotionDialog(true)} data-testid="create-promotion-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Promotion
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Megaphone className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Promotions</p>
                  <p className="text-2xl font-bold">{stats.total_promotions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Play className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold">{stats.active_promotions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-8 h-8 text-green-600" />
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
                <Eye className="w-8 h-8 text-blue-500" />
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
                <MousePointer className="w-8 h-8 text-orange-500" />
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
                <Zap className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">Avg CTR</p>
                  <p className="text-2xl font-bold">{stats.avg_ctr?.toFixed(2) || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search promotions or influencers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Promotions List */}
      {filteredPromotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Promotions Yet</h3>
            <p className="text-gray-500 mb-4">
              Start promoting influencer content to reach more audiences
            </p>
            <Button onClick={() => setShowPromotionDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map(promo => (
            <Card key={promo.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{promo.name}</h3>
                    <p className="text-sm text-gray-500">{promo.influencer_name || 'Unknown Influencer'}</p>
                  </div>
                  <Badge className={STATUS_CONFIG[promo.status]?.color}>
                    {STATUS_CONFIG[promo.status]?.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="capitalize">{promo.platform}</Badge>
                  <Badge variant="outline">{PROMOTION_TYPES.find(t => t.value === promo.promotion_type)?.label || promo.promotion_type}</Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center py-3 border-y mb-3">
                  <div>
                    <p className="text-lg font-bold">{formatNumber(promo.impressions || 0)}</p>
                    <p className="text-xs text-gray-500">Impressions</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{formatNumber(promo.clicks || 0)}</p>
                    <p className="text-xs text-gray-500">Clicks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{promo.ctr?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-gray-500">CTR</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="font-medium">{formatCurrency(promo.budget)}</p>
                  </div>
                  <div className="flex gap-1">
                    {promo.status === 'active' ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleUpdateStatus(promo.id, 'paused')}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : promo.status === 'paused' || promo.status === 'approved' ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleUpdateStatus(promo.id, 'active')}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    ) : null}
                    {promo.original_post_url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(promo.original_post_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Influencer Approval Status */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    {promo.influencer_approved ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Influencer Approved</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-600">Pending Influencer Approval</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Promotion Dialog */}
      <Dialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Content Promotion</DialogTitle>
            <DialogDescription>Promote influencer content as paid advertising</DialogDescription>
          </DialogHeader>
          <CreatePromotionForm
            influencers={influencers}
            onSubmit={handleCreatePromotion}
            onCancel={() => setShowPromotionDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Promotion Form Component
function CreatePromotionForm({ influencers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    influencer_id: '',
    content_source: 'influencer_post',
    original_post_url: '',
    promotion_type: 'boosted_post',
    platform: 'instagram',
    budget: '',
    budget_type: 'lifetime',
    start_date: '',
    end_date: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.influencer_id) {
      toast.error('Please fill required fields');
      return;
    }
    
    const submitData = {
      ...formData,
      budget: parseFloat(formData.budget) || 0
    };
    
    if (!submitData.start_date) delete submitData.start_date;
    if (!submitData.end_date) delete submitData.end_date;
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Promotion Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Summer Collection - @influencer Reel"
          />
        </div>

        <div className="space-y-2">
          <Label>Influencer *</Label>
          <Select value={formData.influencer_id} onValueChange={(v) => setFormData({...formData, influencer_id: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Select influencer" />
            </SelectTrigger>
            <SelectContent>
              {influencers.map(inf => (
                <SelectItem key={inf.id} value={inf.id}>
                  {inf.name} {inf.instagram_handle ? `(@${inf.instagram_handle})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Content Source</Label>
          <Select value={formData.content_source} onValueChange={(v) => setFormData({...formData, content_source: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_SOURCES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Original Post URL</Label>
          <Input
            value={formData.original_post_url}
            onChange={(e) => setFormData({...formData, original_post_url: e.target.value})}
            placeholder="https://instagram.com/p/..."
          />
        </div>

        <div className="space-y-2">
          <Label>Promotion Type</Label>
          <Select value={formData.promotion_type} onValueChange={(v) => setFormData({...formData, promotion_type: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMOTION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={formData.platform} onValueChange={(v) => setFormData({...formData, platform: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Budget (INR)</Label>
          <Input
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({...formData, budget: e.target.value})}
            placeholder="e.g., 5000"
          />
        </div>

        <div className="space-y-2">
          <Label>Budget Type</Label>
          <Select value={formData.budget_type} onValueChange={(v) => setFormData({...formData, budget_type: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="lifetime">Lifetime</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Start Date</Label>
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

        <div className="col-span-2 space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Additional notes about the promotion..."
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Promotion</Button>
      </DialogFooter>
    </form>
  );
}
