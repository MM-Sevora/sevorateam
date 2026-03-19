import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { TipTapEditor } from '../../components/ui/tiptap-editor';
import { toast } from 'sonner';
import { 
  ChevronRight, ArrowLeft, Edit2, Save, X, Clock, User, Eye, 
  MessageSquare, History, FileText, CheckCircle, Send, Trash2,
  ChevronDown, Link2, ExternalLink, Sparkles, Loader2, Plus, FolderPlus
} from 'lucide-react';

const PageEditorPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form
  const [editForm, setEditForm] = useState({ title: '', content: '', status: 'draft' });
  
  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Version history
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  
  // Backlinks (Smart Linking)
  const [backlinks, setBacklinks] = useState([]);
  const [loadingBacklinks, setLoadingBacklinks] = useState(false);

  // Feature Parser state
  const [parsing, setParsing] = useState(false);
  const [showParseModal, setShowParseModal] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectChoice, setProjectChoice] = useState('new');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/knowledge/pages/${pageId}`);
      setPage(response.data);
      setEditForm({
        title: response.data.title,
        content: response.data.content || '',
        status: response.data.status
      });
    } catch (error) {
      toast.error('Failed to load page');
      navigate('/knowledge');
    } finally {
      setLoading(false);
    }
  }, [api, pageId, navigate]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await api.get(`/knowledge/pages/${pageId}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }, [api, pageId]);

  const fetchVersions = async () => {
    setLoadingVersions(true);
    try {
      const response = await api.get(`/knowledge/pages/${pageId}/versions`);
      setVersions(response.data || []);
    } catch (error) {
      toast.error('Failed to load version history');
    } finally {
      setLoadingVersions(false);
    }
  };

  const fetchBacklinks = useCallback(async () => {
    setLoadingBacklinks(true);
    try {
      const response = await api.get(`/knowledge/pages/${pageId}/backlinks`);
      setBacklinks(response.data.backlinks || []);
    } catch (error) {
      console.error('Failed to load backlinks:', error);
    } finally {
      setLoadingBacklinks(false);
    }
  }, [api, pageId]);

  useEffect(() => {
    fetchPage();
    fetchComments();
    fetchBacklinks();
  }, [fetchPage, fetchComments, fetchBacklinks]);

  // Handle wiki link clicks
  useEffect(() => {
    const handleWikiLink = async (event) => {
      const linkText = event.detail;
      try {
        // Search for the page by title
        const response = await api.get(`/knowledge/search/pages`, { params: { q: linkText } });
        const pages = response.data || [];
        
        if (pages.length > 0) {
          // Navigate to the first matching page
          navigate(`/knowledge/page/${pages[0].id}`);
        } else {
          toast.error(`Page "${linkText}" not found`);
        }
      } catch (error) {
        toast.error('Failed to find linked page');
      }
    };
    
    window.addEventListener('wikilink', handleWikiLink);
    return () => window.removeEventListener('wikilink', handleWikiLink);
  }, [api, navigate]);

  const handleSave = async () => {
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/knowledge/pages/${pageId}`, {
        title: editForm.title,
        content: editForm.content,
        status: editForm.status
      });
      
      // Extract and store links for smart linking
      try {
        await api.post(`/knowledge/pages/${pageId}/extract-links`);
      } catch (e) {
        console.error('Failed to extract links:', e);
      }
      
      toast.success('Page saved');
      setEditing(false);
      fetchPage();
      fetchBacklinks();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await api.put(`/knowledge/pages/${pageId}`, { status: 'published' });
      toast.success('Page published');
      fetchPage();
    } catch (error) {
      toast.error('Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      await api.post('/knowledge/comments', {
        page_id: pageId,
        content: newComment
      });
      setNewComment('');
      fetchComments();
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    
    try {
      await api.delete(`/knowledge/comments/${commentId}`);
      fetchComments();
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleRestoreVersion = async (version) => {
    if (!confirm(`Restore to version ${version}?`)) return;
    
    try {
      await api.post(`/knowledge/pages/${pageId}/restore/${version}`);
      toast.success('Version restored');
      setShowHistory(false);
      fetchPage();
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  // Feature Parser functions
  const handleParseAsFeature = async () => {
    if (!page?.content) {
      toast.error('Page has no content to parse');
      return;
    }
    
    setParsing(true);
    try {
      // Strip HTML tags to get plain text
      const plainText = page.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      const response = await api.post('/engineering/feature-parser/parse-text', {
        content: plainText,
        title: page.title
      });
      
      setParsedData(response.data.data);
      setNewProjectName(response.data.data?.feature_title || page.title);
      
      // Fetch projects for selection
      const projectsRes = await api.get('/engineering/feature-parser/projects');
      setProjects(projectsRes.data || []);
      
      setShowParseModal(true);
      toast.success('Page parsed successfully!');
    } catch (err) {
      console.error('Parse error:', err);
      toast.error(err.response?.data?.detail || 'Failed to parse page content');
    } finally {
      setParsing(false);
    }
  };

  const handleCreateArtifacts = async () => {
    if (projectChoice === 'existing' && !selectedProjectId) {
      toast.error('Please select a project');
      return;
    }
    if (projectChoice === 'new' && !newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        project_id: projectChoice === 'existing' ? selectedProjectId : null,
        new_project_name: projectChoice === 'new' ? newProjectName : null,
        new_project_description: projectChoice === 'new' ? parsedData?.feature_description : null,
        parsed_data: parsedData
      };
      
      const response = await api.post('/engineering/feature-parser/create-artifacts', payload);
      
      toast.success(response.data.message);
      setShowParseModal(false);
      setParsedData(null);
      
      // Navigate to the project
      navigate('/engineering/projects');
    } catch (err) {
      console.error('Create error:', err);
      toast.error(err.response?.data?.detail || 'Failed to create artifacts');
    } finally {
      setCreating(false);
    }
  };

  const getTotals = () => {
    if (!parsedData) return { epics: 0, stories: 0, tasks: 0 };
    let stories = 0, tasks = 0;
    parsedData.epics?.forEach(e => {
      stories += e.user_stories?.length || 0;
      e.user_stories?.forEach(s => {
        tasks += s.tasks?.length || 0;
      });
    });
    return { epics: parsedData.epics?.length || 0, stories, tasks };
  };

  // Parse content for wiki-style links and render them
  const renderContentWithLinks = (content) => {
    if (!content) return '';
    
    // Replace [[Page Title]] with actual links
    // This is a simple client-side replacement for display
    let processedContent = content.replace(
      /\[\[([^\]]+)\]\]/g,
      (match, linkText) => {
        return `<a href="#" class="wiki-link text-blue-600 hover:text-blue-800 underline decoration-dotted" data-link="${linkText}" onclick="event.preventDefault(); window.dispatchEvent(new CustomEvent('wikilink', {detail: '${linkText.replace(/'/g, "\\'")}'}))">📄 ${linkText}</a>`;
      }
    );
    
    // Replace @mentions with styled spans
    processedContent = processedContent.replace(
      /@(\w+(?:\s+\w+)?)/g,
      '<span class="mention bg-blue-100 text-blue-700 px-1 rounded">@$1</span>'
    );
    
    // Replace #task-id with styled links
    processedContent = processedContent.replace(
      /#([a-zA-Z0-9-]+)/g,
      '<a href="/projects" class="task-link text-violet-600 hover:text-violet-800">#$1</a>'
    );
    
    return processedContent;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading page...</div>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="page-editor">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button 
              className="text-gray-500 hover:text-blue-600 flex items-center gap-1"
              onClick={() => navigate(`/knowledge/space/${page.space_id}`)}
            >
              <ArrowLeft className="w-4 h-4" /> {page.space_name}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900 truncate max-w-[300px]">{page.title}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              className={`${
                page.status === 'published' ? 'bg-green-100 text-green-700' :
                page.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}
            >
              {page.status}
            </Badge>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { setShowHistory(true); fetchVersions(); }}
            >
              <History className="w-4 h-4 mr-1" /> History
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleParseAsFeature}
              disabled={parsing}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
              title="Parse this document as a feature to generate Epics, Stories & Tasks"
            >
              {parsing ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Parsing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" /> Parse as Feature</>
              )}
            </Button>
            
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                {page.status === 'draft' && (
                  <Button 
                    size="sm" 
                    onClick={handlePublish}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Publish
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-6">
          {/* Page Content */}
          <div className="col-span-3">
            <Card>
              <CardContent className="p-8">
                {editing ? (
                  <div className="space-y-4">
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="text-2xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0"
                      placeholder="Page title"
                    />
                    
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">Status:</span>
                      <Select
                        value={editForm.status}
                        onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <TipTapEditor
                      content={editForm.content}
                      onChange={(html) => setEditForm({ ...editForm, content: html })}
                      placeholder="Write your content here..."
                      minHeight="400px"
                    />
                    
                    {/* Smart Linking Tips */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
                        <Link2 className="w-4 h-4" /> Smart Linking Tips
                      </h4>
                      <ul className="text-xs text-blue-700 mt-2 space-y-1">
                        <li><code className="bg-blue-100 px-1 rounded">[[Page Title]]</code> — Link to another page</li>
                        <li><code className="bg-blue-100 px-1 rounded">@username</code> — Mention a team member</li>
                        <li><code className="bg-blue-100 px-1 rounded">#task-id</code> — Link to a task</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
                    
                    {page.content ? (
                      <div 
                        className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100"
                        dangerouslySetInnerHTML={{ __html: renderContentWithLinks(page.content) }}
                      />
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>This page is empty</p>
                        <Button 
                          variant="outline" 
                          className="mt-3"
                          onClick={() => setEditing(true)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" /> Add content
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Comment */}
                <div className="flex gap-2 mb-4">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Comments List */}
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                          {comment.author_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{comment.author_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                              {(comment.author_id === user?.id || user?.role === 'admin') && (
                                <button 
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-4">No comments yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="col-span-1 space-y-4">
            {/* Page Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Page Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Created by:</span>
                  <span className="font-medium">{page.created_by_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Created:</span>
                  <span>{new Date(page.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Updated:</span>
                  <span>{new Date(page.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Version:</span>
                  <Badge variant="outline">{page.version}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Backlinks (Smart Linking) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-500" />
                  Pages linking here ({backlinks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {loadingBacklinks ? (
                  <div className="text-sm text-gray-400 p-2">Loading...</div>
                ) : backlinks.length === 0 ? (
                  <div className="text-sm text-gray-400 p-2">
                    No pages link to this yet.
                    <p className="text-xs mt-1">Use [[{page.title}]] in other pages to create links.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {backlinks.map(link => (
                      <Link
                        key={link.id}
                        to={`/knowledge/page/${link.id}`}
                        className="flex items-center gap-2 p-2 rounded hover:bg-blue-50 text-left group"
                      >
                        <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block group-hover:text-blue-600">{link.title}</span>
                          <span className="text-xs text-gray-400">{link.space_name}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-blue-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Child Pages */}
            {page.children?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Child Pages</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {page.children.map(child => (
                    <button
                      key={child.id}
                      className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-left"
                      onClick={() => navigate(`/knowledge/page/${child.id}`)}
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm truncate">{child.title}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Version History Panel */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="w-96 bg-white h-full overflow-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold">Version History</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4">
              {loadingVersions ? (
                <p className="text-center text-gray-500 py-8">Loading...</p>
              ) : versions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No version history</p>
              ) : (
                <div className="space-y-2">
                  {versions.map(v => (
                    <div 
                      key={v.version}
                      className="p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Version {v.version}</span>
                        {v.version !== page.version && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRestoreVersion(v.version)}
                          >
                            Restore
                          </Button>
                        )}
                        {v.version === page.version && (
                          <Badge className="bg-green-100 text-green-700">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {v.created_by_name} • {new Date(v.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature Parser Modal */}
      <Dialog open={showParseModal} onOpenChange={setShowParseModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Generated Project Artifacts
            </DialogTitle>
          </DialogHeader>
          
          {parsedData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800">{parsedData.feature_title}</h3>
                <p className="text-sm text-purple-700 mt-1">{parsedData.feature_description}</p>
                <div className="flex gap-2 mt-3">
                  <Badge className="bg-purple-100 text-purple-700">{getTotals().epics} Epics</Badge>
                  <Badge className="bg-blue-100 text-blue-700">{getTotals().stories} Stories</Badge>
                  <Badge className="bg-green-100 text-green-700">{getTotals().tasks} Tasks</Badge>
                </div>
              </div>

              {/* Epics Preview */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {parsedData.epics?.map((epic, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800 text-xs">Epic</Badge>
                      <span className="font-medium text-sm">{epic.title}</span>
                    </div>
                    <div className="mt-2 pl-4 space-y-1">
                      {epic.user_stories?.map((story, sIdx) => (
                        <div key={sIdx} className="text-xs text-gray-600 flex items-center gap-1">
                          <Badge className="bg-blue-50 text-blue-700 text-xs">Story</Badge>
                          {story.title}
                          {story.story_points && <span className="text-gray-400">({story.story_points} pts)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Selection */}
              <div className="border-t pt-4 space-y-3">
                <label className="text-sm font-medium">Create in Project:</label>
                <div className="flex gap-2">
                  <Button
                    variant={projectChoice === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setProjectChoice('new')}
                  >
                    <FolderPlus className="w-4 h-4 mr-1" /> New Project
                  </Button>
                  <Button
                    variant={projectChoice === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setProjectChoice('existing')}
                  >
                    <Link2 className="w-4 h-4 mr-1" /> Existing Project
                  </Button>
                </div>

                {projectChoice === 'new' ? (
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                  />
                ) : (
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateArtifacts} disabled={creating} className="bg-green-600 hover:bg-green-700">
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-1" /> Create Artifacts</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageEditorPage;
