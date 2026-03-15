import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  BookOpen, Plus, ChevronRight, FileText, FolderOpen, Clock,
  ChevronDown, Edit2, Trash2, ArrowLeft, Settings, Lock
} from 'lucide-react';

const SpaceDetailPage = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [space, setSpace] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});
  
  // Create Page Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pageForm, setPageForm] = useState({
    title: '',
    parent_id: '',
    template_id: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchSpace = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/knowledge/spaces/${spaceId}`);
      setSpace(response.data);
      
      // Auto-expand first level
      const expanded = {};
      response.data.page_tree?.forEach(page => {
        if (page.children?.length > 0) {
          expanded[page.id] = true;
        }
      });
      setExpandedNodes(expanded);
    } catch (error) {
      toast.error('Failed to load space');
      navigate('/knowledge');
    } finally {
      setLoading(false);
    }
  }, [api, spaceId, navigate]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/knowledge/templates');
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchSpace();
    fetchTemplates();
  }, [fetchSpace, fetchTemplates]);

  const handleCreatePage = async () => {
    if (!pageForm.title.trim()) {
      toast.error('Page title is required');
      return;
    }
    
    setSaving(true);
    try {
      const response = await api.post('/knowledge/pages', {
        title: pageForm.title,
        space_id: spaceId,
        parent_id: pageForm.parent_id || null,
        template_id: pageForm.template_id || null
      });
      
      toast.success('Page created');
      setShowCreateModal(false);
      setPageForm({ title: '', parent_id: '', template_id: '' });
      
      // Navigate to the new page
      navigate(`/knowledge/page/${response.data.id}`);
    } catch (error) {
      toast.error('Failed to create page');
    } finally {
      setSaving(false);
    }
  };

  const toggleNode = (pageId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
    }));
  };

  const handleDeletePage = async (pageId, e) => {
    e.stopPropagation();
    if (!confirm('Archive this page?')) return;
    
    try {
      await api.delete(`/knowledge/pages/${pageId}`);
      toast.success('Page archived');
      fetchSpace();
    } catch (error) {
      toast.error('Failed to archive page');
    }
  };

  // Render page tree recursively
  const renderPageTree = (pages, level = 0) => {
    return pages.map(page => (
      <div key={page.id} style={{ marginLeft: level * 16 }}>
        <div 
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 cursor-pointer group ${level === 0 ? 'border-b' : ''}`}
          onClick={() => navigate(`/knowledge/page/${page.id}`)}
        >
          {page.children?.length > 0 ? (
            <button 
              className="p-0.5 hover:bg-gray-200 rounded"
              onClick={(e) => { e.stopPropagation(); toggleNode(page.id); }}
            >
              <ChevronRight 
                className={`w-4 h-4 text-gray-400 transition-transform ${expandedNodes[page.id] ? 'rotate-90' : ''}`} 
              />
            </button>
          ) : (
            <span className="w-5" />
          )}
          
          <FileText className="w-4 h-4 text-gray-400" />
          
          <span className="flex-1 font-medium text-gray-800 truncate">{page.title}</span>
          
          <Badge 
            variant="outline" 
            className={`text-xs opacity-0 group-hover:opacity-100 ${
              page.status === 'published' ? 'bg-green-50 text-green-700' : 
              page.status === 'draft' ? 'bg-amber-50 text-amber-700' : ''
            }`}
          >
            {page.status}
          </Badge>
          
          <button 
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded text-red-500"
            onClick={(e) => handleDeletePage(page.id, e)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {page.children?.length > 0 && expandedNodes[page.id] && (
          <div className="ml-2 border-l border-gray-200">
            {renderPageTree(page.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading space...</div>
      </div>
    );
  }

  if (!space) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="space-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span 
              className="hover:text-blue-600 cursor-pointer flex items-center gap-1"
              onClick={() => navigate('/knowledge')}
            >
              <ArrowLeft className="w-4 h-4" /> Knowledge Base
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{space.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: space.color + '20' }}
            >
              {space.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {space.name}
                {space.is_private && <Lock className="w-4 h-4 text-gray-400" />}
              </h1>
              {space.description && (
                <p className="text-gray-500">{space.description}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-page-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> New Page
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-4 gap-6">
        {/* Page Tree Sidebar */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Pages ({space.page_count})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {space.page_tree?.length > 0 ? (
              <div className="space-y-1">
                {renderPageTree(space.page_tree)}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No pages yet</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Create first page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="col-span-3 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{space.page_count}</p>
                  <p className="text-sm text-gray-500">Total Pages</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold capitalize">{space.space_type}</p>
                  <p className="text-sm text-gray-500">Space Type</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{new Date(space.updated_at).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">Last Updated</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Templates Quick Access */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quick Start from Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {templates.slice(0, 8).map(template => (
                  <button
                    key={template.id}
                    className="p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                    onClick={() => {
                      setPageForm({ title: template.name, parent_id: '', template_id: template.id });
                      setShowCreateModal(true);
                    }}
                  >
                    <span className="text-xl">{template.icon}</span>
                    <p className="text-sm font-medium mt-1 truncate">{template.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{template.category.replace('_', ' ')}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {space.page_tree?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">All Pages</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {space.page_tree.slice(0, 10).map(page => (
                    <div 
                      key={page.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/knowledge/page/${page.id}`)}
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{page.title}</p>
                        <p className="text-xs text-gray-500">
                          Updated {new Date(page.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{page.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Page Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Page Title *</Label>
              <Input
                value={pageForm.title}
                onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                placeholder="e.g., Getting Started Guide"
                data-testid="page-title-input"
              />
            </div>
            
            <div>
              <Label>Parent Page (optional)</Label>
              <Select
                value={pageForm.parent_id}
                onValueChange={(v) => setPageForm({ ...pageForm, parent_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (top-level)</SelectItem>
                  {space.page_tree?.map(page => (
                    <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Template (optional)</Label>
              <Select
                value={pageForm.template_id}
                onValueChange={(v) => setPageForm({ ...pageForm, template_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Blank page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Blank page</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.icon} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePage} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="save-page-btn"
            >
              {saving ? 'Creating...' : 'Create Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpaceDetailPage;
