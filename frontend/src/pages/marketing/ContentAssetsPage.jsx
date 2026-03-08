import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Image, FileText, Video, FolderOpen, Download, Plus, Search, Upload,
  CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Edit2, Trash2,
  MoreHorizontal, ExternalLink, Eye, Link2, Instagram, Youtube, Copy,
  FileImage, Share2, Newspaper, Users, TrendingUp, Play, Heart, MessageCircle
} from 'lucide-react';

const ASSET_TYPES = [
  { value: 'logo', label: 'Logo', icon: Image },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'guideline', label: 'Guideline', icon: FileText },
  { value: 'press_release', label: 'Press Release', icon: FileText },
  { value: 'founder_image', label: 'Founder Image', icon: Image },
  { value: 'product_image', label: 'Product Image', icon: FileImage },
  { value: 'brand_story', label: 'Brand Story', icon: FileText },
];

const TEMPLATE_TYPES = [
  { value: 'email', label: 'Email Template' },
  { value: 'outreach', label: 'Outreach Template' },
  { value: 'press_release', label: 'Press Release' },
  { value: 'campaign_brief', label: 'Campaign Brief' },
  { value: 'pitch', label: 'Pitch Template' },
];

const CONTENT_TYPES = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'video', label: 'Video' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'blog', label: 'Blog' },
  { value: 'live', label: 'Live' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
];

const ContentAssetsPage = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('brand_assets');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Data states
  const [assets, setAssets] = useState([]);
  const [ugc, setUgc] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deliveryStats, setDeliveryStats] = useState({});
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showUGCModal, setShowUGCModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Form states
  const [newAsset, setNewAsset] = useState({
    name: '', asset_type: 'image', category: 'brand_assets', description: '', file_url: '', tags: '', campaign_id: ''
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '', template_type: 'email', subject: '', content: '', variables: '', tags: ''
  });
  const [newDelivery, setNewDelivery] = useState({
    contact_id: '', campaign_id: '', deliverable_id: '', platform: 'instagram', content_type: 'post', content_url: '',
    title: '', publish_date: '', views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, rate_amount: 0
  });
  const [selectedInfluencerRateCards, setSelectedInfluencerRateCards] = useState([]);
  const [newUGC, setNewUGC] = useState({
    contact_id: '', campaign_id: '', platform: 'instagram', content_type: 'post', 
    title: '', media_urls: '', caption: ''
  });

  // Filters
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterContentType, setFilterContentType] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');

  // Fetch functions
  const fetchAssets = useCallback(async (category) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('category', category);
      
      const response = await api.get(`/marketing/v2/assets?${params.toString()}`);
      setAssets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, [api, search]);

  const fetchUGC = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterPlatform !== 'all') params.append('platform', filterPlatform);
      if (filterCampaign !== 'all') params.append('campaign_id', filterCampaign);
      
      const response = await api.get(`/marketing/v2/ugc?${params.toString()}`);
      setUgc(response.data || []);
    } catch (error) {
      console.error('Failed to fetch UGC:', error);
    } finally {
      setLoading(false);
    }
  }, [api, search, filterPlatform, filterCampaign]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await api.get(`/marketing/v2/templates?${params.toString()}`);
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, [api, search]);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterPlatform !== 'all') params.append('platform', filterPlatform);
      if (filterContentType !== 'all') params.append('content_type', filterContentType);
      if (filterCampaign !== 'all') params.append('campaign_id', filterCampaign);
      
      const response = await api.get(`/marketing/v2/deliveries/influencer?${params.toString()}`);
      setDeliveries(response.data || []);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
    }
  }, [api, search, filterPlatform, filterContentType, filterCampaign]);

  const fetchCoverage = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCampaign !== 'all') params.append('campaign_id', filterCampaign);
      
      const response = await api.get(`/marketing/v2/pr/coverage?${params.toString()}`);
      setCoverage(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coverage:', error);
    } finally {
      setLoading(false);
    }
  }, [api, search, filterCampaign]);

  const fetchDeliveryStats = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/deliveries/stats');
      setDeliveryStats(response.data || {});
    } catch (error) {
      console.error('Failed to fetch delivery stats:', error);
    }
  }, [api]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/unified-campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  }, [api]);

  const fetchContacts = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/contacts?contact_type=influencer&limit=500');
      setContacts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  }, [api]);

  const fetchInfluencerRateCards = useCallback(async (contactId) => {
    if (!contactId) {
      setSelectedInfluencerRateCards([]);
      return;
    }
    try {
      const response = await api.get(`/marketing/v2/contacts/${contactId}/deliverables`);
      setSelectedInfluencerRateCards(response.data || []);
    } catch (error) {
      console.error('Failed to fetch rate cards:', error);
      setSelectedInfluencerRateCards([]);
    }
  }, [api]);

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
    fetchDeliveryStats();
  }, [fetchCampaigns, fetchContacts, fetchDeliveryStats]);

  useEffect(() => {
    if (activeTab === 'brand_assets' || activeTab === 'press_kit') {
      fetchAssets(activeTab);
    } else if (activeTab === 'templates') {
      fetchTemplates();
    } else if (activeTab === 'ugc_library') {
      fetchUGC();
    } else if (activeTab === 'deliveries') {
      fetchDeliveries();
      fetchCoverage();
    }
  }, [activeTab, fetchAssets, fetchTemplates, fetchUGC, fetchDeliveries, fetchCoverage]);

  // Handlers
  const handleUploadAsset = async () => {
    if (!newAsset.name || !newAsset.file_url) {
      toast.error('Name and file URL are required');
      return;
    }
    try {
      await api.post('/marketing/v2/assets', {
        ...newAsset,
        tags: newAsset.tags.split(',').map(t => t.trim()).filter(Boolean),
        campaign_id: newAsset.campaign_id || null,
      });
      toast.success('Asset uploaded');
      setShowUploadModal(false);
      setNewAsset({ name: '', asset_type: 'image', category: 'brand_assets', description: '', file_url: '', tags: '', campaign_id: '' });
      fetchAssets(activeTab);
    } catch (error) {
      toast.error('Failed to upload asset');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Name and content are required');
      return;
    }
    try {
      if (editingTemplate) {
        await api.put(`/marketing/v2/templates/${editingTemplate.id}`, {
          ...newTemplate,
          variables: newTemplate.variables.split(',').map(v => v.trim()).filter(Boolean),
          tags: newTemplate.tags.split(',').map(t => t.trim()).filter(Boolean),
        });
        toast.success('Template updated');
      } else {
        await api.post('/marketing/v2/templates', {
          ...newTemplate,
          variables: newTemplate.variables.split(',').map(v => v.trim()).filter(Boolean),
          tags: newTemplate.tags.split(',').map(t => t.trim()).filter(Boolean),
        });
        toast.success('Template created');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setNewTemplate({ name: '', template_type: 'email', subject: '', content: '', variables: '', tags: '' });
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleCreateDelivery = async () => {
    if (!newDelivery.contact_id || !newDelivery.content_url) {
      toast.error('Influencer and content URL are required');
      return;
    }
    try {
      // Find the selected rate card to get pricing info
      const selectedRateCard = selectedInfluencerRateCards.find(rc => rc.id === newDelivery.deliverable_id);
      
      await api.post('/marketing/v2/deliveries/influencer', {
        ...newDelivery,
        campaign_id: newDelivery.campaign_id || null,
        deliverable_name: selectedRateCard?.name || newDelivery.content_type,
        rate_amount: selectedRateCard?.rate || newDelivery.rate_amount || 0,
      });
      toast.success('Delivery recorded');
      setShowDeliveryModal(false);
      setNewDelivery({
        contact_id: '', campaign_id: '', deliverable_id: '', platform: 'instagram', content_type: 'post', content_url: '',
        title: '', publish_date: '', views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, rate_amount: 0
      });
      setSelectedInfluencerRateCards([]);
      fetchDeliveries();
      fetchDeliveryStats();
    } catch (error) {
      toast.error('Failed to record delivery');
    }
  };

  const handleCreateUGC = async () => {
    if (!newUGC.contact_id) {
      toast.error('Influencer is required');
      return;
    }
    try {
      await api.post('/marketing/v2/ugc', {
        ...newUGC,
        media_urls: newUGC.media_urls.split(',').map(u => u.trim()).filter(Boolean),
        campaign_id: newUGC.campaign_id || null,
      });
      toast.success('UGC added');
      setShowUGCModal(false);
      setNewUGC({ contact_id: '', campaign_id: '', platform: 'instagram', content_type: 'post', title: '', media_urls: '', caption: '' });
      fetchUGC();
    } catch (error) {
      toast.error('Failed to add UGC');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await api.delete(`/marketing/v2/assets/${assetId}`);
      toast.success('Asset deleted');
      fetchAssets(activeTab);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/marketing/v2/templates/${templateId}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteDelivery = async (deliveryId) => {
    if (!window.confirm('Delete this delivery record?')) return;
    try {
      await api.delete(`/marketing/v2/deliveries/influencer/${deliveryId}`);
      toast.success('Delivery deleted');
      fetchDeliveries();
      fetchDeliveryStats();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

  const handleCopyTemplate = (template) => {
    navigator.clipboard.writeText(template.content);
    toast.success('Template copied to clipboard');
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      template_type: template.template_type,
      subject: template.subject || '',
      content: template.content || '',
      variables: template.variables?.join(', ') || '',
      tags: template.tags?.join(', ') || '',
    });
    setShowTemplateModal(true);
  };

  const handlePreview = (item, type) => {
    setPreviewItem({ ...item, type });
    setShowPreviewModal(true);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getAssetIcon = (type) => {
    if (type?.includes('image') || type === 'logo' || type === 'founder_image' || type === 'product_image') return Image;
    if (type === 'video') return Video;
    return FileText;
  };

  const getPlatformIcon = (platform) => {
    if (platform === 'instagram') return Instagram;
    if (platform === 'youtube') return Youtube;
    return Play;
  };

  return (
    <div className="p-8 space-y-6" data-testid="content-assets-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Asset Management</p>
          <h1 className="text-3xl font-semibold text-gray-900">Content & Assets</h1>
          <p className="text-gray-500 mt-1 text-sm">Brand assets, press kit, templates, UGC library, and deliveries</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="brand_assets">Brand Assets</TabsTrigger>
          <TabsTrigger value="press_kit">Press Kit</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="ugc_library">UGC Library</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>

        {/* Brand Assets Tab */}
        <TabsContent value="brand_assets" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10" 
                placeholder="Search brand assets..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => { setNewAsset({ ...newAsset, category: 'brand_assets' }); setShowUploadModal(true); }} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
              <Plus className="w-4 h-4 mr-2" /> Upload Asset
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : assets.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-700">No brand assets yet</h3>
              <p className="text-gray-500 text-sm">Upload logos, product photos, campaign creatives</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map(asset => {
                const AssetIcon = getAssetIcon(asset.asset_type);
                return (
                  <Card key={asset.id} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-4">
                      <div 
                        className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3 cursor-pointer overflow-hidden"
                        onClick={() => handlePreview(asset, 'asset')}
                      >
                        {(asset.asset_type === 'image' || asset.asset_type === 'logo' || asset.asset_type === 'product_image' || asset.asset_type === 'founder_image') ? (
                          <img src={asset.file_url} alt={asset.name} className="max-h-full max-w-full object-contain" />
                        ) : asset.asset_type === 'video' ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
                            <Play className="w-12 h-12 text-white" />
                          </div>
                        ) : (
                          <AssetIcon className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{asset.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">{asset.asset_type}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(asset, 'asset')}><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(asset.file_url)}><Download className="w-4 h-4 mr-2" /> Download</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteAsset(asset.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {asset.campaign_name && (
                        <div className="mt-2">
                          <Badge className="bg-amber-100 text-amber-700 text-xs">{asset.campaign_name}</Badge>
                        </div>
                      )}
                      {asset.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {asset.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Press Kit Tab */}
        <TabsContent value="press_kit" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Search press kit..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.info('Share link copied!')}><Share2 className="w-4 h-4 mr-2" /> Share Kit</Button>
              <Button onClick={() => { setNewAsset({ ...newAsset, category: 'press_kit' }); setShowUploadModal(true); }} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add to Press Kit
              </Button>
            </div>
          </div>
          
          {/* Press Kit Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: 'press_release', label: 'Press Releases', icon: FileText, color: 'bg-blue-50 border-blue-200' },
              { type: 'founder_image', label: 'Founder Images', icon: Users, color: 'bg-purple-50 border-purple-200' },
              { type: 'product_image', label: 'Product Images', icon: FileImage, color: 'bg-amber-50 border-amber-200' },
              { type: 'brand_story', label: 'Brand Story', icon: Newspaper, color: 'bg-green-50 border-green-200' },
            ].map(cat => {
              const catAssets = assets.filter(a => a.asset_type === cat.type);
              return (
                <Card key={cat.type} className={`${cat.color}`}>
                  <CardContent className="p-4 text-center">
                    <cat.icon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <h3 className="font-medium">{cat.label}</h3>
                    <p className="text-2xl font-bold mt-1">{catAssets.length}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Press Kit Assets */}
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : assets.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Newspaper className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-700">No press kit assets</h3>
              <p className="text-gray-500 text-sm">Add press releases, founder images, product photos</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map(asset => {
                const AssetIcon = getAssetIcon(asset.asset_type);
                return (
                  <Card key={asset.id} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-4">
                      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3 cursor-pointer overflow-hidden" onClick={() => handlePreview(asset, 'asset')}>
                        {(asset.asset_type?.includes('image') || asset.asset_type === 'logo') ? (
                          <img src={asset.file_url} alt={asset.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <AssetIcon className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{asset.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs capitalize">{asset.asset_type?.replace(/_/g, ' ')}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(asset.file_url)}><Download className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => { setEditingTemplate(null); setNewTemplate({ name: '', template_type: 'email', subject: '', content: '', variables: '', tags: '' }); setShowTemplateModal(true); }} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : templates.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-700">No templates yet</h3>
              <p className="text-gray-500 text-sm">Create email, outreach, and pitch templates</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-gray-100 text-gray-700 capitalize">{template.template_type?.replace(/_/g, ' ')}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}><Edit2 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyTemplate(template)}><Copy className="w-4 h-4 mr-2" /> Copy</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                    {template.subject && <p className="text-sm text-gray-500">Subject: {template.subject}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 max-h-24 overflow-hidden">
                      {template.content?.substring(0, 150)}...
                    </div>
                    {template.variables?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {template.variables.map((v, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>Used {template.usage_count || 0} times</span>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyTemplate(template)}><Copy className="w-3 h-3 mr-1" /> Use</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* UGC Library Tab */}
        <TabsContent value="ugc_library" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-10 w-[200px]" placeholder="Search UGC..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowUGCModal(true)} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add UGC
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : ugc.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Image className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-700">No UGC yet</h3>
              <p className="text-gray-500 text-sm">Content from influencers will appear here</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ugc.map(item => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3 overflow-hidden cursor-pointer" onClick={() => handlePreview(item, 'ugc')}>
                      {item.media_urls?.[0] ? (
                        <img src={item.media_urls[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Image className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                    <p className="text-xs text-gray-500">{item.contact_name} • {item.platform}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{item.content_type}</Badge>
                      {item.campaign_name && <Badge className="bg-amber-100 text-amber-700 text-xs">{item.campaign_name}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                <div className="text-2xl font-bold text-gray-900">{deliveryStats.influencer_deliveries?.total || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Influencer Posts</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Newspaper className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-gray-900">{deliveryStats.pr_coverage?.total || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">PR Coverage</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <Eye className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-gray-900">{formatNumber(deliveryStats.influencer_deliveries?.total_views)}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Views</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-gray-900">{formatNumber((deliveryStats.influencer_deliveries?.total_reach || 0) + (deliveryStats.pr_coverage?.total_reach || 0))}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Reach</div>
              </CardContent>
            </Card>
          </div>

          {/* Sub-tabs for Influencer Deliveries and PR Coverage */}
          <Tabs defaultValue="influencer_deliveries" className="space-y-4">
            <TabsList>
              <TabsTrigger value="influencer_deliveries">Influencer Deliveries</TabsTrigger>
              <TabsTrigger value="pr_coverage">PR Coverage</TabsTrigger>
            </TabsList>

            {/* Influencer Deliveries */}
            <TabsContent value="influencer_deliveries" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-10 w-[200px]" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Platform" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterContentType} onValueChange={setFilterContentType}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setShowDeliveryModal(true)} className="bg-[#c4a35a] hover:bg-[#b39349] text-white" data-testid="add-delivery-btn">
                  <Plus className="w-4 h-4 mr-2" /> Record Delivery
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : deliveries.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Play className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-medium text-gray-700">No deliveries recorded</h3>
                  <p className="text-gray-500 text-sm">Track content published by influencers</p>
                </CardContent></Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs uppercase">Influencer</TableHead>
                      <TableHead className="text-xs uppercase">Platform</TableHead>
                      <TableHead className="text-xs uppercase">Type</TableHead>
                      <TableHead className="text-xs uppercase">Campaign</TableHead>
                      <TableHead className="text-xs uppercase">Date</TableHead>
                      <TableHead className="text-xs uppercase">Engagement</TableHead>
                      <TableHead className="text-xs uppercase">Reach</TableHead>
                      <TableHead className="text-xs uppercase w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map(delivery => {
                      const PlatformIcon = getPlatformIcon(delivery.platform);
                      return (
                        <TableRow key={delivery.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{delivery.contact_name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <PlatformIcon className="w-4 h-4" />
                              <span className="capitalize">{delivery.platform}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{delivery.content_type}</Badge></TableCell>
                          <TableCell className="text-gray-600">{delivery.campaign_name || '-'}</TableCell>
                          <TableCell className="text-gray-600">{delivery.publish_date}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" />{formatNumber(delivery.likes)}</span>
                              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-500" />{formatNumber(delivery.comments)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatNumber(delivery.reach)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open(delivery.content_url, '_blank')}><ExternalLink className="w-4 h-4 mr-2" /> View Post</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteDelivery(delivery.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* PR Coverage */}
            <TabsContent value="pr_coverage" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-10" placeholder="Search coverage..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : coverage.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Newspaper className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-medium text-gray-700">No PR coverage recorded</h3>
                  <p className="text-gray-500 text-sm">Track media mentions and articles</p>
                </CardContent></Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs uppercase">Publication</TableHead>
                      <TableHead className="text-xs uppercase">Article Title</TableHead>
                      <TableHead className="text-xs uppercase">Type</TableHead>
                      <TableHead className="text-xs uppercase">Journalist</TableHead>
                      <TableHead className="text-xs uppercase">Date</TableHead>
                      <TableHead className="text-xs uppercase">Est. Reach</TableHead>
                      <TableHead className="text-xs uppercase w-[80px]">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverage.map(item => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.publication}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.title}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{item.coverage_type}</Badge></TableCell>
                        <TableCell className="text-gray-600">{item.author || '-'}</TableCell>
                        <TableCell className="text-gray-600">{item.published_date}</TableCell>
                        <TableCell className="font-medium">{formatNumber(item.estimated_reach)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => window.open(item.url, '_blank')}><ExternalLink className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Upload Asset Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg" data-testid="upload-asset-modal">
          <DialogHeader><DialogTitle>Upload Asset</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">NAME *</Label>
              <Input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="Asset name" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">TYPE</Label>
                <Select value={newAsset.asset_type} onValueChange={v => setNewAsset({...newAsset, asset_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">CATEGORY</Label>
                <Select value={newAsset.category} onValueChange={v => setNewAsset({...newAsset, category: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand_assets">Brand Assets</SelectItem>
                    <SelectItem value="press_kit">Press Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">FILE URL *</Label>
              <Input value={newAsset.file_url} onChange={e => setNewAsset({...newAsset, file_url: e.target.value})} placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">LINK TO CAMPAIGN</Label>
              <Select value={newAsset.campaign_id || 'none'} onValueChange={v => setNewAsset({...newAsset, campaign_id: v === 'none' ? '' : v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select campaign..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Campaign</SelectItem>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">DESCRIPTION</Label>
              <Input value={newAsset.description} onChange={e => setNewAsset({...newAsset, description: e.target.value})} placeholder="Brief description" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">TAGS (comma-separated)</Label>
              <Input value={newAsset.tags} onChange={e => setNewAsset({...newAsset, tags: e.target.value})} placeholder="logo, 2026, collection" className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            <Button onClick={handleUploadAsset} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">Upload Asset</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl" data-testid="template-modal">
          <DialogHeader><DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">NAME *</Label>
                <Input value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="Template name" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">TYPE</Label>
                <Select value={newTemplate.template_type} onValueChange={v => setNewTemplate({...newTemplate, template_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newTemplate.template_type === 'email' && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">SUBJECT LINE</Label>
                <Input value={newTemplate.subject} onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})} placeholder="Email subject..." className="mt-1" />
              </div>
            )}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">CONTENT *</Label>
              <Textarea 
                value={newTemplate.content} 
                onChange={e => setNewTemplate({...newTemplate, content: e.target.value})} 
                placeholder="Template content... Use {{variable}} for placeholders"
                className="mt-1 min-h-[200px] font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">VARIABLES (comma-separated)</Label>
              <Input value={newTemplate.variables} onChange={e => setNewTemplate({...newTemplate, variables: e.target.value})} placeholder="name, company, product" className="mt-1" />
              <p className="text-xs text-gray-500 mt-1">These will appear as {'{{variable}}'} in your template</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">TAGS</Label>
              <Input value={newTemplate.tags} onChange={e => setNewTemplate({...newTemplate, tags: e.target.value})} placeholder="outreach, fashion, PR" className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}>Cancel</Button>
            <Button onClick={handleCreateTemplate} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent className="max-w-lg" data-testid="delivery-modal">
          <DialogHeader><DialogTitle>Record Influencer Delivery</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">INFLUENCER *</Label>
                <Select 
                  value={newDelivery.contact_id || 'none'} 
                  onValueChange={v => {
                    const contactId = v === 'none' ? '' : v;
                    setNewDelivery({...newDelivery, contact_id: contactId, deliverable_id: ''});
                    fetchInfluencerRateCards(contactId);
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Influencer</SelectItem>
                    {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN</Label>
                <Select value={newDelivery.campaign_id || 'none'} onValueChange={v => setNewDelivery({...newDelivery, campaign_id: v === 'none' ? '' : v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Campaign</SelectItem>
                    {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Rate Card Selection - shows when influencer is selected */}
            {newDelivery.contact_id && (
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <Label className="text-xs uppercase tracking-wider text-purple-700 mb-2 block">
                  SELECT RATE CARD / DELIVERABLE
                </Label>
                {selectedInfluencerRateCards.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No rate cards found for this influencer</p>
                ) : (
                  <Select 
                    value={newDelivery.deliverable_id || 'none'} 
                    onValueChange={v => {
                      const rateCard = selectedInfluencerRateCards.find(rc => rc.id === v);
                      setNewDelivery({
                        ...newDelivery, 
                        deliverable_id: v === 'none' ? '' : v,
                        content_type: rateCard?.name?.toLowerCase().includes('reel') ? 'reel' :
                                      rateCard?.name?.toLowerCase().includes('story') ? 'story' :
                                      rateCard?.name?.toLowerCase().includes('video') ? 'video' : 'post',
                        rate_amount: rateCard?.rate || 0
                      });
                    }}
                  >
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select rate card..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Rate Card</SelectItem>
                      {selectedInfluencerRateCards.map(rc => (
                        <SelectItem key={rc.id} value={rc.id}>
                          {rc.name} - ₹{(rc.rate || 0).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {newDelivery.deliverable_id && (
                  <p className="text-xs text-purple-600 mt-2">
                    Rate: ₹{(selectedInfluencerRateCards.find(rc => rc.id === newDelivery.deliverable_id)?.rate || 0).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">PLATFORM</Label>
                <Select value={newDelivery.platform} onValueChange={v => setNewDelivery({...newDelivery, platform: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">CONTENT TYPE</Label>
                <Select value={newDelivery.content_type} onValueChange={v => setNewDelivery({...newDelivery, content_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">CONTENT URL *</Label>
              <Input value={newDelivery.content_url} onChange={e => setNewDelivery({...newDelivery, content_url: e.target.value})} placeholder="https://instagram.com/p/..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">TITLE</Label>
                <Input value={newDelivery.title} onChange={e => setNewDelivery({...newDelivery, title: e.target.value})} placeholder="Post title..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">PUBLISH DATE</Label>
                <Input type="date" value={newDelivery.publish_date} onChange={e => setNewDelivery({...newDelivery, publish_date: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div className="border-t pt-4">
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">ENGAGEMENT METRICS</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Views</Label>
                  <Input type="number" value={newDelivery.views} onChange={e => setNewDelivery({...newDelivery, views: parseInt(e.target.value) || 0})} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Likes</Label>
                  <Input type="number" value={newDelivery.likes} onChange={e => setNewDelivery({...newDelivery, likes: parseInt(e.target.value) || 0})} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Comments</Label>
                  <Input type="number" value={newDelivery.comments} onChange={e => setNewDelivery({...newDelivery, comments: parseInt(e.target.value) || 0})} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Shares</Label>
                  <Input type="number" value={newDelivery.shares} onChange={e => setNewDelivery({...newDelivery, shares: parseInt(e.target.value) || 0})} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Saves</Label>
                  <Input type="number" value={newDelivery.saves} onChange={e => setNewDelivery({...newDelivery, saves: parseInt(e.target.value) || 0})} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Reach</Label>
                  <Input type="number" value={newDelivery.reach} onChange={e => setNewDelivery({...newDelivery, reach: parseInt(e.target.value) || 0})} className="mt-1" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowDeliveryModal(false)}>Cancel</Button>
            <Button onClick={handleCreateDelivery} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">Record Delivery</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* UGC Modal */}
      <Dialog open={showUGCModal} onOpenChange={setShowUGCModal}>
        <DialogContent className="max-w-lg" data-testid="ugc-modal">
          <DialogHeader><DialogTitle>Add UGC Content</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">INFLUENCER *</Label>
                <Select value={newUGC.contact_id || 'none'} onValueChange={v => setNewUGC({...newUGC, contact_id: v === 'none' ? '' : v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Influencer</SelectItem>
                    {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">CAMPAIGN</Label>
                <Select value={newUGC.campaign_id || 'none'} onValueChange={v => setNewUGC({...newUGC, campaign_id: v === 'none' ? '' : v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Campaign</SelectItem>
                    {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">PLATFORM</Label>
                <Select value={newUGC.platform} onValueChange={v => setNewUGC({...newUGC, platform: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">CONTENT TYPE</Label>
                <Select value={newUGC.content_type} onValueChange={v => setNewUGC({...newUGC, content_type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">TITLE</Label>
              <Input value={newUGC.title} onChange={e => setNewUGC({...newUGC, title: e.target.value})} placeholder="Content title..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">MEDIA URLS (comma-separated)</Label>
              <Input value={newUGC.media_urls} onChange={e => setNewUGC({...newUGC, media_urls: e.target.value})} placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">CAPTION</Label>
              <Textarea value={newUGC.caption} onChange={e => setNewUGC({...newUGC, caption: e.target.value})} placeholder="Original caption..." className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowUGCModal(false)}>Cancel</Button>
            <Button onClick={handleCreateUGC} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">Add UGC</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Preview: {previewItem?.name || previewItem?.title}</DialogTitle></DialogHeader>
          <div className="py-4">
            {previewItem?.type === 'asset' && (
              <>
                {(previewItem.asset_type === 'image' || previewItem.asset_type === 'logo' || previewItem.asset_type?.includes('image')) ? (
                  <img src={previewItem.file_url} alt={previewItem.name} className="max-w-full max-h-[500px] mx-auto rounded-lg" />
                ) : previewItem.asset_type === 'video' ? (
                  <video src={previewItem.file_url} controls className="max-w-full max-h-[500px] mx-auto rounded-lg" />
                ) : previewItem.asset_type === 'document' || previewItem.file_url?.endsWith('.pdf') ? (
                  <iframe src={previewItem.file_url} className="w-full h-[500px] rounded-lg border" title="Document Preview" />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">Preview not available for this file type</p>
                    <Button className="mt-4" onClick={() => handleDownload(previewItem.file_url)}>
                      <Download className="w-4 h-4 mr-2" /> Download File
                    </Button>
                  </div>
                )}
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <Badge variant="outline" className="mr-2">{previewItem.asset_type}</Badge>
                    {previewItem.tags?.map((tag, i) => <Badge key={i} variant="outline" className="mr-1 text-xs">{tag}</Badge>)}
                  </div>
                  <Button onClick={() => handleDownload(previewItem.file_url)}><Download className="w-4 h-4 mr-2" /> Download</Button>
                </div>
              </>
            )}
            {previewItem?.type === 'ugc' && (
              <>
                {previewItem.media_urls?.[0] ? (
                  <img src={previewItem.media_urls[0]} alt={previewItem.title} className="max-w-full max-h-[400px] mx-auto rounded-lg" />
                ) : (
                  <div className="h-[200px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <Image className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="mt-4">
                  <p className="font-medium">{previewItem.contact_name}</p>
                  <p className="text-sm text-gray-600">{previewItem.platform} • {previewItem.content_type}</p>
                  {previewItem.caption && <p className="mt-2 text-gray-700">{previewItem.caption}</p>}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentAssetsPage;
