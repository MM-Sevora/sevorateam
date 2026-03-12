import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Progress } from '../../components/ui/progress';
import {
  Upload, FolderPlus, Search, Grid, List, Filter, MoreHorizontal,
  Image, Video, FileText, Music, Archive, File, Download, Trash2, Edit,
  Eye, Link, Tag, FolderOpen, ChevronRight, RefreshCw, Cloud, CloudOff,
  X, Check, ExternalLink, Copy
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Asset type config
const ASSET_TYPE_CONFIG = {
  image: { label: 'Image', icon: Image, color: 'text-green-500', bgColor: 'bg-green-100' },
  video: { label: 'Video', icon: Video, color: 'text-purple-500', bgColor: 'bg-purple-100' },
  document: { label: 'Document', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  graphic: { label: 'Graphic', icon: Image, color: 'text-pink-500', bgColor: 'bg-pink-100' },
  audio: { label: 'Audio', icon: Music, color: 'text-orange-500', bgColor: 'bg-orange-100' },
  archive: { label: 'Archive', icon: Archive, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  other: { label: 'Other', icon: File, color: 'text-gray-400', bgColor: 'bg-gray-50' }
};

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' }
];

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function CreativeAssetsPage() {
  const [activeTab, setActiveTab] = useState('assets');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [storageStatus, setStorageStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [folders, setFolders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Root' }]);
  
  // Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentFolder]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, statsRes, foldersRes, assetsRes] = await Promise.all([
        fetch(`${API_URL}/api/marketing/v3/assets/storage/status`),
        fetch(`${API_URL}/api/marketing/v3/assets/overview/stats`),
        fetch(`${API_URL}/api/marketing/v3/assets/folders${currentFolder ? `?parent_id=${currentFolder}` : ''}`),
        fetch(`${API_URL}/api/marketing/v3/assets${currentFolder ? `?folder_id=${currentFolder}` : ''}`)
      ]);

      if (statusRes.ok) setStorageStatus(await statusRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (foldersRes.ok) setFolders(await foldersRes.json());
      if (assetsRes.ok) setAssets(await assetsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load assets data');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
    setCurrentFolder(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const handleCreateFolder = async (name) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/assets/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          parent_id: currentFolder
        })
      });

      if (response.ok) {
        toast.success('Folder created successfully');
        setShowFolderDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create folder');
      }
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploadProgress({ total: files.length, completed: 0, current: '' });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => ({ ...prev, current: file.name }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) formData.append('folder_id', currentFolder);

        const response = await fetch(`${API_URL}/api/marketing/v3/assets/upload`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        } else {
          const error = await response.json();
          toast.error(`Failed to upload ${file.name}: ${error.detail}`);
        }
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploadProgress(null);
    setShowUploadDialog(false);
    fetchData();
    toast.success('Upload completed');
  };

  const handleDeleteAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/assets/${assetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Asset deleted');
        fetchData();
        setShowAssetDialog(false);
      }
    } catch (error) {
      toast.error('Failed to delete asset');
    }
  };

  const handleDownload = async (asset) => {
    try {
      if (asset.download_url) {
        window.open(asset.download_url, '_blank');
      } else {
        window.open(`${API_URL}/api/marketing/v3/assets/${asset.id}/download`, '_blank');
      }
    } catch (error) {
      toast.error('Failed to download asset');
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || asset.type === selectedType;
    const matchesPlatform = selectedPlatform === 'all' || asset.platform === selectedPlatform;
    return matchesSearch && matchesType && matchesPlatform;
  });

  return (
    <div className="p-6 space-y-6" data-testid="creative-assets-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creative Assets</h1>
          <p className="text-gray-500">Manage your marketing creative files and media</p>
        </div>
        <div className="flex gap-2">
          {storageStatus && (
            <Badge variant="outline" className={storageStatus.configured ? 'text-green-600' : 'text-red-600'}>
              {storageStatus.configured ? (
                <><Cloud className="w-3 h-3 mr-1" /> SharePoint Connected</>
              ) : (
                <><CloudOff className="w-3 h-3 mr-1" /> SharePoint Not Connected</>
              )}
            </Badge>
          )}
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowFolderDialog(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setShowUploadDialog(true)} data-testid="upload-btn">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <File className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Assets</p>
                  <p className="text-2xl font-bold">{stats.total_assets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Folders</p>
                  <p className="text-2xl font-bold">{stats.total_folders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Cloud className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Storage Used</p>
                  <p className="text-2xl font-bold">{formatFileSize(stats.total_size)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Upload className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recent Uploads</p>
                  <p className="text-2xl font-bold">{stats.recent_uploads}</p>
                  <p className="text-xs text-gray-400">Last 7 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id || 'root'}>
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`hover:text-primary ${index === breadcrumbs.length - 1 ? 'font-medium' : 'text-gray-500'}`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="asset-search"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Folders */}
        {folders.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folders.map(folder => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleFolderClick(folder)}
                >
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <FolderOpen className="w-8 h-8 text-yellow-500" />
                    <div className="overflow-hidden">
                      <p className="font-medium truncate">{folder.name}</p>
                      <p className="text-xs text-gray-400">{folder.asset_count} items</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Assets */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Assets {filteredAssets.length > 0 && `(${filteredAssets.length})`}
          </h3>

          {filteredAssets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">
                  {assets.length === 0 ? 'No assets in this folder' : 'No assets match your filters'}
                </p>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Assets
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={() => {
                    setSelectedAsset(asset);
                    setShowAssetDialog(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Size</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Platform</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Uploaded</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAssets.map(asset => {
                      const TypeIcon = ASSET_TYPE_CONFIG[asset.type]?.icon || File;
                      return (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded ${ASSET_TYPE_CONFIG[asset.type]?.bgColor}`}>
                                <TypeIcon className={`w-4 h-4 ${ASSET_TYPE_CONFIG[asset.type]?.color}`} />
                              </div>
                              <span className="font-medium truncate max-w-[200px]">{asset.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {ASSET_TYPE_CONFIG[asset.type]?.label}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatFileSize(asset.file_size)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{asset.platform}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(asset.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setShowAssetDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(asset)}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Assets</DialogTitle>
            <DialogDescription>
              Upload files to {breadcrumbs[breadcrumbs.length - 1].name}
            </DialogDescription>
          </DialogHeader>
          <UploadArea onUpload={handleUpload} progress={uploadProgress} />
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <CreateFolderForm
            onSubmit={handleCreateFolder}
            onCancel={() => setShowFolderDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Asset Detail Dialog */}
      <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
        <DialogContent className="max-w-2xl">
          {selectedAsset && (
            <AssetDetailView
              asset={selectedAsset}
              onDownload={() => handleDownload(selectedAsset)}
              onDelete={() => handleDeleteAsset(selectedAsset.id)}
              onClose={() => setShowAssetDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Asset Card Component
function AssetCard({ asset, onClick }) {
  const TypeIcon = ASSET_TYPE_CONFIG[asset.type]?.icon || File;
  const isImage = asset.type === 'image';
  const isVideo = asset.type === 'video';

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors overflow-hidden group"
      onClick={onClick}
    >
      {/* Preview */}
      <div className="aspect-square bg-gray-100 relative">
        {isImage && asset.file_url ? (
          <img
            src={asset.file_url}
            alt={asset.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`w-full h-full flex items-center justify-center ${isImage ? 'hidden' : ''}`}
          style={{ display: isImage && asset.file_url ? 'none' : 'flex' }}
        >
          <TypeIcon className={`w-12 h-12 ${ASSET_TYPE_CONFIG[asset.type]?.color}`} />
        </div>
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
              <Video className="w-5 h-5 text-gray-700" />
            </div>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* Info */}
      <CardContent className="p-3">
        <p className="font-medium truncate text-sm">{asset.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">{formatFileSize(asset.file_size)}</span>
          <Badge variant="outline" className="text-xs">
            {asset.platform}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Upload Area Component
function UploadArea({ onUpload, progress }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };

  if (progress) {
    return (
      <div className="py-8 space-y-4">
        <div className="text-center">
          <Upload className="w-12 h-12 mx-auto mb-3 text-primary animate-pulse" />
          <p className="font-medium">Uploading...</p>
          <p className="text-sm text-gray-500">{progress.current}</p>
        </div>
        <Progress value={(progress.completed / progress.total) * 100} />
        <p className="text-center text-sm text-gray-500">
          {progress.completed} of {progress.total} files
        </p>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-gray-200'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="font-medium mb-2">Drag and drop files here</p>
      <p className="text-sm text-gray-500 mb-4">or</p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
      />
      <Button onClick={() => fileInputRef.current?.click()}>
        Browse Files
      </Button>
      <p className="text-xs text-gray-400 mt-4">
        Supported: Images, Videos, Documents, Archives (Max 100MB)
      </p>
    </div>
  );
}

// Create Folder Form
function CreateFolderForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    onSubmit(name);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Folder Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Summer Campaign 2026"
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Folder</Button>
      </DialogFooter>
    </form>
  );
}

// Asset Detail View
function AssetDetailView({ asset, onDownload, onDelete, onClose }) {
  const TypeIcon = ASSET_TYPE_CONFIG[asset.type]?.icon || File;
  const isImage = asset.type === 'image';

  const copyUrl = () => {
    navigator.clipboard.writeText(asset.file_url);
    toast.success('URL copied to clipboard');
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <TypeIcon className={`w-5 h-5 ${ASSET_TYPE_CONFIG[asset.type]?.color}`} />
          {asset.name}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-6">
        {/* Preview */}
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {isImage && asset.file_url ? (
            <img src={asset.file_url} alt={asset.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <TypeIcon className={`w-20 h-20 ${ASSET_TYPE_CONFIG[asset.type]?.color}`} />
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <Label className="text-gray-500">File Size</Label>
            <p className="font-medium">{formatFileSize(asset.file_size)}</p>
          </div>

          <div>
            <Label className="text-gray-500">Type</Label>
            <p className="font-medium">{ASSET_TYPE_CONFIG[asset.type]?.label}</p>
          </div>

          <div>
            <Label className="text-gray-500">Platform</Label>
            <Badge variant="outline">{asset.platform}</Badge>
          </div>

          <div>
            <Label className="text-gray-500">Uploaded</Label>
            <p className="font-medium">{formatDate(asset.created_at)}</p>
          </div>

          {asset.tags && asset.tags.length > 0 && (
            <div>
              <Label className="text-gray-500">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {asset.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {asset.file_url && (
            <div>
              <Label className="text-gray-500">URL</Label>
              <div className="flex gap-2 mt-1">
                <Input value={asset.file_url} readOnly className="text-xs" />
                <Button variant="outline" size="sm" onClick={copyUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onDelete} className="text-red-600">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <Button variant="outline" onClick={onDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        {asset.file_url && (
          <Button onClick={() => window.open(asset.file_url, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
