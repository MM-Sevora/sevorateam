import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Image, FileText, Video, FolderOpen, Download, Plus, Search,
  CheckCircle, XCircle, Clock, AlertCircle, RefreshCw
} from 'lucide-react';

const ASSET_TYPES = [
  { value: 'logo', label: 'Logo', icon: Image },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'guideline', label: 'Guideline', icon: FileText },
  { value: 'template', label: 'Template', icon: FileText },
];

const CATEGORIES = [
  { value: 'brand_assets', label: 'Brand Assets' },
  { value: 'press_kit', label: 'Press Kit' },
  { value: 'templates', label: 'Templates' },
  { value: 'ugc_library', label: 'UGC Library' },
];

const APPROVAL_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  revision_requested: { label: 'Revision', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
};

const ContentAssetsPage = () => {
  const { api, user } = useAuth();
  const [activeTab, setActiveTab] = useState('brand_assets');
  const [assets, setAssets] = useState([]);
  const [ugc, setUgc] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [newAsset, setNewAsset] = useState({
    name: '', asset_type: 'image', category: 'brand_assets', description: '', file_url: '', tags: ''
  });

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeTab !== 'approvals') params.append('category', activeTab);
      
      const response = await api.get(`/marketing/v2/assets?${params.toString()}`);
      setAssets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, [api, search, activeTab]);

  const fetchUGC = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/ugc');
      setUgc(response.data || []);
    } catch (error) {
      console.error('Failed to fetch UGC:', error);
    }
  }, [api]);

  const fetchApprovals = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/approvals');
      setApprovals(response.data || []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    }
  }, [api]);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchApprovals();
    } else if (activeTab === 'ugc_library') {
      fetchUGC();
    } else {
      fetchAssets();
    }
  }, [activeTab, fetchAssets, fetchUGC, fetchApprovals]);

  const handleUploadAsset = async () => {
    try {
      const data = {
        ...newAsset,
        tags: newAsset.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      await api.post('/marketing/v2/assets', data);
      toast.success('Asset uploaded');
      setShowUploadModal(false);
      setNewAsset({ name: '', asset_type: 'image', category: 'brand_assets', description: '', file_url: '', tags: '' });
      fetchAssets();
    } catch (error) {
      toast.error('Failed to upload asset');
    }
  };

  const handleApprovalAction = async (approvalId, status) => {
    try {
      await api.put(`/marketing/v2/approvals/${approvalId}/review`, null, {
        params: { status, reviewed_by: user?.id }
      });
      toast.success(`Item ${status}`);
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to update approval');
    }
  };

  const handleDownload = async (asset) => {
    try {
      await api.put(`/marketing/v2/assets/${asset.id}/download`);
      window.open(asset.file_url, '_blank');
    } catch (error) {
      console.error('Download tracking failed:', error);
      window.open(asset.file_url, '_blank');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getAssetIcon = (type) => {
    const config = ASSET_TYPES.find(t => t.value === type);
    return config?.icon || Image;
  };

  return (
    <div className="p-8 space-y-6" data-testid="content-assets-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Asset Management</p>
          <h1 className="text-3xl font-semibold text-gray-900">Content & Assets</h1>
          <p className="text-gray-500 mt-1 text-sm">Brand assets, press kit, templates, and UGC library</p>
        </div>
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogTrigger asChild>
            <Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
              <Plus className="w-4 h-4 mr-2" /> Upload Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Asset</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="Asset name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={newAsset.asset_type} onValueChange={v => setNewAsset({...newAsset, asset_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newAsset.category} onValueChange={v => setNewAsset({...newAsset, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(c => c.value !== 'ugc_library').map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>File URL *</Label>
                <Input value={newAsset.file_url} onChange={e => setNewAsset({...newAsset, file_url: e.target.value})} placeholder="https://..." />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={newAsset.description} onChange={e => setNewAsset({...newAsset, description: e.target.value})} placeholder="Brief description" />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={newAsset.tags} onChange={e => setNewAsset({...newAsset, tags: e.target.value})} placeholder="spring, collection, 2026" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button onClick={handleUploadAsset} className="bg-amber-700 hover:bg-amber-800">Upload</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EDE5]">
          <TabsTrigger value="brand_assets">Brand Assets</TabsTrigger>
          <TabsTrigger value="press_kit">Press Kit</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="ugc_library">UGC Library</TabsTrigger>
          <TabsTrigger value="approvals">Approval Queue ({approvals.length})</TabsTrigger>
        </TabsList>

        {/* Brand Assets / Press Kit / Templates */}
        {['brand_assets', 'press_kit', 'templates'].map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5D4A3A]" />
              <Input 
                className="pl-10 border-[#E8D5C4]" 
                placeholder="Search assets..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
            ) : assets.length === 0 ? (
              <Card className="border-[#E8D5C4]">
                <CardContent className="py-12 text-center">
                  <FolderOpen className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                  <h3 className="font-medium text-[#4A3728]">No assets yet</h3>
                  <p className="text-[#5D4A3A]">Upload your first asset</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.map(asset => {
                  const AssetIcon = getAssetIcon(asset.asset_type);
                  return (
                    <Card key={asset.id} className="border-[#E8D5C4] hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                          {asset.asset_type === 'image' || asset.asset_type === 'logo' ? (
                            <img src={asset.file_url} alt={asset.name} className="max-h-full max-w-full object-contain rounded" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                          ) : null}
                          <AssetIcon className="w-12 h-12 text-[#5D4A3A]" style={{display: asset.asset_type === 'image' || asset.asset_type === 'logo' ? 'none' : 'block'}} />
                        </div>
                        <h3 className="font-medium text-[#4A3728] truncate">{asset.name}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline">{asset.asset_type}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(asset)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        {asset.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {asset.tags.slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
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
        ))}

        {/* UGC Library */}
        <TabsContent value="ugc_library" className="space-y-4">
          {ugc.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Image className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No UGC yet</h3>
                <p className="text-[#5D4A3A]">Content from influencers will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ugc.map(item => (
                <Card key={item.id} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                      {item.media_urls?.[0] ? (
                        <img src={item.media_urls[0]} alt={item.title} className="max-h-full max-w-full object-cover rounded" />
                      ) : (
                        <Image className="w-12 h-12 text-[#5D4A3A]" />
                      )}
                    </div>
                    <h3 className="font-medium text-[#4A3728] truncate">{item.title}</h3>
                    <p className="text-xs text-[#5D4A3A]">{item.contact_name} • {item.platform}</p>
                    <Badge variant="outline" className="mt-2">{item.content_type}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approval Queue */}
        <TabsContent value="approvals" className="space-y-4">
          {approvals.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="font-medium text-[#4A3728]">All caught up!</h3>
                <p className="text-[#5D4A3A]">No pending approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approvals.map(approval => {
                const statusConfig = APPROVAL_STATUS_CONFIG[approval.status] || APPROVAL_STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                return (
                  <Card key={approval.id} className="border-[#E8D5C4]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusConfig.color}`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-[#4A3728]">{approval.item_title || approval.item_type}</h3>
                            <p className="text-sm text-[#5D4A3A]">
                              Submitted by {approval.submitted_by_name || 'Unknown'} • {formatDate(approval.submitted_at)}
                            </p>
                          </div>
                        </div>
                        {approval.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleApprovalAction(approval.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprovalAction(approval.id, 'approved')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          </div>
                        )}
                        {approval.status !== 'pending' && (
                          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentAssetsPage;
