import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  BookOpen, Plus, Search, FolderOpen, FileText, Users, Lock,
  Building2, Code, Package, ArrowRight, Clock, Sparkles
} from 'lucide-react';

const KnowledgeBasePage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [spaces, setSpaces] = useState([]);
  const [recentPages, setRecentPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Create Space Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    space_type: 'team',
    icon: '📚',
    color: '#3B82F6',
    is_private: false
  });
  const [saving, setSaving] = useState(false);

  const spaceTypeIcons = {
    engineering: <Code className="w-5 h-5" />,
    product: <Package className="w-5 h-5" />,
    company: <Building2 className="w-5 h-5" />,
    team: <Users className="w-5 h-5" />,
    project: <FolderOpen className="w-5 h-5" />
  };

  const iconOptions = ['📚', '📖', '📝', '💡', '🚀', '⚙️', '🎯', '📊', '🔧', '💻', '🏗️', '📋'];
  const colorOptions = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
    '#EC4899', '#6366F1', '#14B8A6', '#84CC16', '#F97316'
  ];

  const fetchSpaces = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/knowledge/spaces');
      setSpaces(response.data || []);
    } catch (error) {
      toast.error('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchRecentPages = useCallback(async () => {
    try {
      const response = await api.get('/knowledge/pages?limit=10');
      setRecentPages(response.data || []);
    } catch (error) {
      console.error('Failed to load recent pages:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchSpaces();
    fetchRecentPages();
  }, [fetchSpaces, fetchRecentPages]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    setSearching(true);
    try {
      const response = await api.get(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!formData.name.trim()) {
      toast.error('Space name is required');
      return;
    }
    
    setSaving(true);
    try {
      const response = await api.post('/knowledge/spaces', formData);
      toast.success('Space created');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        space_type: 'team',
        icon: '📚',
        color: '#3B82F6',
        is_private: false
      });
      fetchSpaces();
      // Navigate to the new space
      navigate(`/knowledge/space/${response.data.id}`);
    } catch (error) {
      toast.error('Failed to create space');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedTemplates = async () => {
    try {
      const response = await api.post('/knowledge/seed-templates');
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Failed to seed templates');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="knowledge-base-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Knowledge Base
          </h1>
          <p className="text-gray-500 mt-1">
            Documentation, wikis, and team knowledge
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeedTemplates}>
            <Sparkles className="w-4 h-4 mr-2" /> Add Templates
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-space-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Space
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search knowledge base..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map(page => (
                  <div 
                    key={page.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/knowledge/page/${page.id}`)}
                  >
                    <span className="text-lg">{page.space_icon || '📄'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{page.title}</p>
                      <p className="text-xs text-gray-500">{page.space_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spaces Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Spaces</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading spaces...</div>
        ) : spaces.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No spaces yet</h3>
              <p className="text-gray-500 mt-1 mb-4">
                Create your first space to start building your knowledge base
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Space
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {spaces.map(space => (
              <Card 
                key={space.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/knowledge/space/${space.id}`)}
                data-testid={`space-card-${space.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: space.color + '20' }}
                      >
                        {space.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 flex items-center gap-2">
                          {space.name}
                          {space.is_private && <Lock className="w-3 h-3 text-gray-400" />}
                        </h3>
                        <p className="text-sm text-gray-500">{space.page_count} pages</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                  </div>
                  {space.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {space.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {spaceTypeIcons[space.space_type]}
                      <span className="ml-1 capitalize">{space.space_type}</span>
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Pages */}
      {recentPages.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Recently Updated
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentPages.slice(0, 5).map(page => (
                  <div 
                    key={page.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/knowledge/page/${page.id}`)}
                  >
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: (page.space_color || '#3B82F6') + '20' }}
                    >
                      <FileText className="w-4 h-4" style={{ color: page.space_color || '#3B82F6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{page.title}</p>
                      <p className="text-xs text-gray-500">
                        {page.space_name} • Updated {new Date(page.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {page.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Space Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Engineering Docs"
                data-testid="space-name-input"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this space for?"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.space_type}
                  onValueChange={(v) => setFormData({ ...formData, space_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Visibility</Label>
                <Select
                  value={formData.is_private ? 'private' : 'public'}
                  onValueChange={(v) => setFormData({ ...formData, is_private: v === 'private' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (Everyone)</SelectItem>
                    <SelectItem value="private">Private (Invite only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl hover:bg-gray-50 transition-colors ${formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    onClick={() => setFormData({ ...formData, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateSpace} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="save-space-btn"
            >
              {saving ? 'Creating...' : 'Create Space'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBasePage;
