import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Smartphone, Apple, Globe, Plus, Rocket, Clock, CheckCircle, 
  AlertTriangle, Package, RefreshCw, Eye, Edit, Trash2, Link2,
  ExternalLink, Loader2, Filter, Calendar, FileText, XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const platformConfig = {
  ios: { 
    icon: Apple, 
    label: 'iOS', 
    color: 'bg-gray-900 text-white',
    store: 'App Store'
  },
  android: { 
    icon: Smartphone, 
    label: 'Android', 
    color: 'bg-green-600 text-white',
    store: 'Play Store'
  },
  web: { 
    icon: Globe, 
    label: 'Web', 
    color: 'bg-blue-600 text-white',
    store: 'Web App'
  }
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  building: { label: 'Building', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  testing: { label: 'Testing', color: 'bg-purple-100 text-purple-700', icon: Eye },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700', icon: Clock },
  in_review: { label: 'In Review', color: 'bg-orange-100 text-orange-700', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  released: { label: 'Released', color: 'bg-emerald-100 text-emerald-700', icon: Rocket },
  rolled_back: { label: 'Rolled Back', color: 'bg-red-100 text-red-700', icon: RefreshCw }
};

const AppReleasesPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [releases, setReleases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '',
    version: '',
    build_number: '',
    platform: 'ios',
    release_notes: '',
    target_date: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (platformFilter) params.platform = platformFilter;
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.project_id = projectFilter;
      
      const [releasesRes, projectsRes] = await Promise.all([
        api.get('/engineering/app-releases', { params }),
        api.get('/projects/list')
      ]);
      
      setReleases(releasesRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load releases');
    } finally {
      setLoading(false);
    }
  }, [api, platformFilter, statusFilter, projectFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateRelease = () => {
    setEditingRelease(null);
    setFormData({
      project_id: projectFilter || '',
      version: '',
      build_number: '',
      platform: 'ios',
      release_notes: '',
      target_date: ''
    });
    setShowModal(true);
  };

  const handleEditRelease = (release) => {
    setEditingRelease(release);
    setFormData({
      project_id: release.project_id,
      version: release.version,
      build_number: release.build_number || '',
      platform: release.platform,
      release_notes: release.release_notes || '',
      target_date: release.target_date || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.project_id || !formData.version || !formData.platform) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      if (editingRelease) {
        await api.put(`/engineering/app-releases/${editingRelease.id}`, formData);
        toast.success('Release updated');
      } else {
        await api.post('/engineering/app-releases', formData);
        toast.success('Release created');
      }
      
      setShowModal(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save release');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (releaseId, newStatus) => {
    try {
      await api.put(`/engineering/app-releases/${releaseId}`, { status: newStatus });
      toast.success('Status updated');
      await fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (releaseId) => {
    if (!window.confirm('Are you sure you want to delete this release?')) return;
    
    try {
      await api.delete(`/engineering/app-releases/${releaseId}`);
      toast.success('Release deleted');
      await fetchData();
    } catch (error) {
      toast.error('Failed to delete release');
    }
  };

  // Group releases by platform
  const iosReleases = releases.filter(r => r.platform === 'ios');
  const androidReleases = releases.filter(r => r.platform === 'android');
  const webReleases = releases.filter(r => r.platform === 'web');

  const ReleaseCard = ({ release }) => {
    const platform = platformConfig[release.platform];
    const status = statusConfig[release.status];
    const PlatformIcon = platform?.icon || Smartphone;
    const StatusIcon = status?.icon || Clock;
    const progress = release.total_tasks > 0 
      ? Math.round((release.completed_tasks / release.total_tasks) * 100) 
      : 0;

    return (
      <Card className="hover:shadow-md transition-shadow" data-testid={`release-card-${release.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className={platform?.color || 'bg-gray-100'}>
                <PlatformIcon className="w-3 h-3 mr-1" />
                {platform?.label}
              </Badge>
              <span className="font-bold text-lg">{release.version}</span>
              {release.build_number && (
                <span className="text-xs text-gray-500">({release.build_number})</span>
              )}
            </div>
            <Badge className={status?.color || 'bg-gray-100'}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status?.label}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{release.project_name}</p>
          
          {release.release_notes && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{release.release_notes}</p>
          )}
          
          {/* Task Progress */}
          {release.total_tasks > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Tasks</span>
                <span>{release.completed_tasks}/{release.total_tasks} ({progress}%)</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
          
          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            {release.target_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Target: {format(parseISO(release.target_date), 'MMM d, yyyy')}
              </span>
            )}
            {release.actual_release_date && (
              <span className="flex items-center gap-1 text-green-600">
                <Rocket className="w-3 h-3" />
                Released: {format(parseISO(release.actual_release_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          
          {/* Store URL */}
          {release.store_url && (
            <a 
              href={release.store_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:underline flex items-center gap-1 mb-3"
            >
              <ExternalLink className="w-3 h-3" />
              View on {platform?.store}
            </a>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Select 
              value={release.status} 
              onValueChange={(v) => handleStatusChange(release.id, v)}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => handleEditRelease(release)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(release.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="app-releases-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Rocket className="w-6 h-6 text-violet-600" />
            App Releases
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage iOS, Android & Web releases</p>
        </div>
        
        <Button 
          onClick={handleCreateRelease}
          className="bg-violet-600 hover:bg-violet-700"
          data-testid="create-release-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> New Release
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-gray-400" />
            
            <Select value={projectFilter || 'all'} onValueChange={(v) => setProjectFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={platformFilter || 'all'} onValueChange={(v) => setPlatformFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Releases by Platform */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : releases.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No releases yet</h3>
            <p className="text-sm text-gray-500 mt-1">Create your first release to track app versions</p>
            <Button 
              className="mt-4 bg-violet-600 hover:bg-violet-700"
              onClick={handleCreateRelease}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Release
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              All ({releases.length})
            </TabsTrigger>
            <TabsTrigger value="ios">
              <Apple className="w-4 h-4 mr-1" /> iOS ({iosReleases.length})
            </TabsTrigger>
            <TabsTrigger value="android">
              <Smartphone className="w-4 h-4 mr-1" /> Android ({androidReleases.length})
            </TabsTrigger>
            <TabsTrigger value="web">
              <Globe className="w-4 h-4 mr-1" /> Web ({webReleases.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {releases.map(release => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="ios" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {iosReleases.map(release => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="android" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {androidReleases.map(release => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="web" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {webReleases.map(release => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRelease ? 'Edit Release' : 'Create New Release'}
            </DialogTitle>
            <DialogDescription>
              Track app version releases for iOS, Android, and Web
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project *</label>
              <Select 
                value={formData.project_id} 
                onValueChange={(v) => setFormData({ ...formData, project_id: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Version *</label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Build Number</label>
                <Input
                  value={formData.build_number}
                  onChange={(e) => setFormData({ ...formData, build_number: e.target.value })}
                  placeholder="123"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Platform *</label>
              <div className="flex items-center gap-3 mt-2">
                {Object.entries(platformConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setFormData({ ...formData, platform: key })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.platform === key 
                          ? `${cfg.color} border-transparent` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Target Release Date</label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Release Notes</label>
              <Textarea
                value={formData.release_notes}
                onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
                placeholder="What's new in this version..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              {editingRelease ? 'Update' : 'Create'} Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppReleasesPage;
