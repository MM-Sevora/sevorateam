import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import api from '../../lib/api';
import { 
  FileText, Upload, ChevronDown, ChevronRight, Plus, Trash2, 
  Edit2, Check, X, Loader2, FolderPlus, Link as LinkIcon,
  Code, Palette, Server, TestTube, BookOpen, Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';

const FeatureParserPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [documentText, setDocumentText] = useState('');
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectChoice, setProjectChoice] = useState('new'); // 'new' or 'existing'
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [expandedEpics, setExpandedEpics] = useState({});
  const [expandedStories, setExpandedStories] = useState({});
  const [editingItem, setEditingItem] = useState(null);

  // File dropzone
  const onDrop = useCallback((acceptedFiles) => {
    const docxFile = acceptedFiles.find(f => f.name.endsWith('.docx'));
    if (docxFile) {
      setFile(docxFile);
      setParsedData(null);
      setDocumentText('');
    } else {
      toast.error('Please upload a DOCX file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  // Parse document
  const handleParse = async () => {
    if (!file) return;
    
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/engineering/feature-parser/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setParsedData(response.data.data);
      setDocumentText(response.data.document_text || '');
      
      // Expand first epic by default
      if (response.data.data?.epics?.length > 0) {
        setExpandedEpics({ [response.data.data.epics[0].id]: true });
      }
      
      toast.success('Document parsed successfully!');
    } catch (err) {
      console.error('Parse error:', err);
      toast.error(err.response?.data?.detail || 'Failed to parse document');
    } finally {
      setParsing(false);
    }
  };

  // Fetch projects for selection
  const fetchProjects = async () => {
    try {
      const response = await api.get('/engineering/feature-parser/projects');
      setProjects(response.data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  // Open project selection dialog
  const handleCreateArtifacts = () => {
    fetchProjects();
    setNewProjectName(parsedData?.feature_title || 'New Project');
    setNewProjectDesc(parsedData?.feature_description || '');
    setShowProjectDialog(true);
  };

  // Create artifacts
  const handleConfirmCreate = async () => {
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
        new_project_description: projectChoice === 'new' ? newProjectDesc : null,
        parsed_data: parsedData
      };
      
      const response = await api.post('/engineering/feature-parser/create-artifacts', payload);
      
      toast.success(response.data.message);
      setShowProjectDialog(false);
      
      // Navigate to the project
      navigate(`/engineering/projects`);
    } catch (err) {
      console.error('Create error:', err);
      toast.error(err.response?.data?.detail || 'Failed to create artifacts');
    } finally {
      setCreating(false);
    }
  };

  // Edit handlers
  const startEdit = (type, id, field, value) => {
    setEditingItem({ type, id, field, value });
  };

  const saveEdit = () => {
    if (!editingItem) return;
    
    const { type, id, field, value } = editingItem;
    
    setParsedData(prev => {
      const updated = { ...prev };
      
      if (type === 'feature') {
        updated[field] = value;
      } else if (type === 'epic') {
        updated.epics = prev.epics.map(e => 
          e.id === id ? { ...e, [field]: value } : e
        );
      } else if (type === 'story') {
        updated.epics = prev.epics.map(e => ({
          ...e,
          user_stories: e.user_stories.map(s =>
            s.id === id ? { ...s, [field]: value } : s
          )
        }));
      } else if (type === 'task') {
        updated.epics = prev.epics.map(e => ({
          ...e,
          user_stories: e.user_stories.map(s => ({
            ...s,
            tasks: s.tasks.map(t =>
              t.id === id ? { ...t, [field]: value } : t
            )
          }))
        }));
      }
      
      return updated;
    });
    
    setEditingItem(null);
  };

  const cancelEdit = () => setEditingItem(null);

  // Delete handlers
  const deleteEpic = (epicId) => {
    setParsedData(prev => ({
      ...prev,
      epics: prev.epics.filter(e => e.id !== epicId)
    }));
  };

  const deleteStory = (epicId, storyId) => {
    setParsedData(prev => ({
      ...prev,
      epics: prev.epics.map(e => 
        e.id === epicId 
          ? { ...e, user_stories: e.user_stories.filter(s => s.id !== storyId) }
          : e
      )
    }));
  };

  const deleteTask = (epicId, storyId, taskId) => {
    setParsedData(prev => ({
      ...prev,
      epics: prev.epics.map(e => 
        e.id === epicId 
          ? { 
              ...e, 
              user_stories: e.user_stories.map(s =>
                s.id === storyId
                  ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) }
                  : s
              )
            }
          : e
      )
    }));
  };

  // Task type icons
  const getTaskIcon = (type) => {
    switch (type) {
      case 'design': return <Palette className="h-4 w-4 text-pink-500" />;
      case 'frontend': return <Code className="h-4 w-4 text-blue-500" />;
      case 'backend': return <Server className="h-4 w-4 text-green-500" />;
      case 'qa': return <TestTube className="h-4 w-4 text-orange-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Count totals
  const getTotals = () => {
    if (!parsedData) return { epics: 0, stories: 0, tasks: 0 };
    let stories = 0, tasks = 0;
    parsedData.epics.forEach(e => {
      stories += e.user_stories.length;
      e.user_stories.forEach(s => {
        tasks += s.tasks.length;
      });
    });
    return { epics: parsedData.epics.length, stories, tasks };
  };

  const totals = getTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728] flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Feature Document Parser
          </h1>
          <p className="text-[#6B5D52] mt-1">
            Upload a feature document to automatically generate Epics, User Stories, and Tasks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upload & Document */}
        <div className="lg:col-span-1 space-y-4">
          {/* Upload Zone */}
          <Card className="border-[#E8D5C4] bg-white/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#4A3728]">Upload Document</CardTitle>
              <CardDescription>Upload a DOCX feature document</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                  ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-[#E8D5C4] hover:border-purple-400 hover:bg-purple-50/50'}`}
              >
                <input {...getInputProps()} />
                <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragActive ? 'text-purple-600' : 'text-gray-400'}`} />
                {file ? (
                  <div>
                    <p className="text-sm font-medium text-[#4A3728]">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-[#6B5D52]">
                      {isDragActive ? 'Drop the file here' : 'Drag & drop or click to select'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Only .docx files supported</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleParse}
                disabled={!file || parsing}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Parse Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Document Preview */}
          {documentText && (
            <Card className="border-[#E8D5C4] bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Document Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto text-sm text-[#6B5D52] whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {documentText}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Images from document */}
          {parsedData?.images?.length > 0 && (
            <Card className="border-[#E8D5C4] bg-white/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#4A3728]">Architecture Diagrams</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parsedData.images.map((img, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <img src={img.data} alt={img.name || `Diagram ${idx + 1}`} className="w-full" />
                    <p className="text-xs text-gray-500 p-2 bg-gray-50">{img.name}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Parsed Preview */}
        <div className="lg:col-span-2">
          {parsedData ? (
            <Card className="border-[#E8D5C4] bg-white/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-[#4A3728]">Generated Artifacts Preview</CardTitle>
                    <CardDescription className="mt-1">
                      Review and edit before creating. Click any text to edit.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {totals.epics} Epics
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {totals.stories} Stories
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {totals.tasks} Tasks
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feature Title & Description */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingItem?.type === 'feature' && editingItem?.field === 'feature_title' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingItem.value}
                            onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                            className="font-semibold"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4 text-red-600" /></Button>
                        </div>
                      ) : (
                        <h3 
                          className="font-semibold text-lg text-purple-800 cursor-pointer hover:text-purple-600"
                          onClick={() => startEdit('feature', null, 'feature_title', parsedData.feature_title)}
                        >
                          {parsedData.feature_title}
                        </h3>
                      )}
                      {editingItem?.type === 'feature' && editingItem?.field === 'feature_description' ? (
                        <div className="flex items-start gap-2 mt-2">
                          <Textarea
                            value={editingItem.value}
                            onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                            rows={2}
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4 text-green-600" /></Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4 text-red-600" /></Button>
                          </div>
                        </div>
                      ) : (
                        <p 
                          className="text-sm text-purple-700 mt-1 cursor-pointer hover:text-purple-500"
                          onClick={() => startEdit('feature', null, 'feature_description', parsedData.feature_description)}
                        >
                          {parsedData.feature_description || 'Click to add description...'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Epics List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {parsedData.epics.map((epic) => (
                    <Collapsible
                      key={epic.id}
                      open={expandedEpics[epic.id]}
                      onOpenChange={(open) => setExpandedEpics({ ...expandedEpics, [epic.id]: open })}
                    >
                      <div className="border rounded-lg bg-white">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              {expandedEpics[epic.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <Badge className="bg-purple-100 text-purple-800">Epic</Badge>
                              <span className="font-medium text-[#4A3728]">{epic.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {epic.user_stories.length} stories
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); deleteEpic(epic.id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="border-t px-3 pb-3 space-y-2">
                            <p className="text-sm text-gray-600 py-2">{epic.description}</p>
                            
                            {/* User Stories */}
                            {epic.user_stories.map((story) => (
                              <Collapsible
                                key={story.id}
                                open={expandedStories[story.id]}
                                onOpenChange={(open) => setExpandedStories({ ...expandedStories, [story.id]: open })}
                              >
                                <div className="border rounded-lg bg-blue-50/50 ml-4">
                                  <CollapsibleTrigger className="w-full">
                                    <div className="flex items-center justify-between p-2 hover:bg-blue-50">
                                      <div className="flex items-center gap-2">
                                        {expandedStories[story.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        <Badge className="bg-blue-100 text-blue-800 text-xs">Story</Badge>
                                        <span className="text-sm font-medium">{story.title}</span>
                                        {story.story_points && (
                                          <Badge variant="outline" className="text-xs bg-white">
                                            {story.story_points} pts
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs">
                                          {story.tasks.length} tasks
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                          onClick={(e) => { e.stopPropagation(); deleteStory(epic.id, story.id); }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <div className="border-t px-2 pb-2 space-y-2">
                                      <p className="text-xs text-gray-600 py-1 italic">{story.description}</p>
                                      
                                      {/* Acceptance Criteria */}
                                      {story.acceptance_criteria?.length > 0 && (
                                        <div className="text-xs">
                                          <span className="font-medium text-gray-700">Acceptance Criteria:</span>
                                          <ul className="list-disc list-inside mt-1 text-gray-600">
                                            {story.acceptance_criteria.map((ac, idx) => (
                                              <li key={idx}>{ac}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {/* Tasks */}
                                      <div className="space-y-1 mt-2">
                                        {story.tasks.map((task) => (
                                          <div 
                                            key={task.id}
                                            className="flex items-center justify-between bg-white rounded px-2 py-1 border"
                                          >
                                            <div className="flex items-center gap-2">
                                              {getTaskIcon(task.type)}
                                              <span className="text-xs">{task.title}</span>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                                              onClick={() => deleteTask(epic.id, story.id, task.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>

                {/* Create Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleCreateArtifacts}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create All Artifacts ({totals.epics} Epics, {totals.stories} Stories, {totals.tasks} Tasks)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#E8D5C4] bg-white/80 min-h-[400px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No document parsed yet</p>
                <p className="text-sm mt-1">Upload a DOCX file and click "Parse Document" to get started</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Project Selection Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Project</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={projectChoice === 'new' ? 'default' : 'outline'}
                onClick={() => setProjectChoice('new')}
                className="flex-1"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
              <Button
                variant={projectChoice === 'existing' ? 'default' : 'outline'}
                onClick={() => setProjectChoice('existing')}
                className="flex-1"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link to Existing
              </Button>
            </div>

            {projectChoice === 'new' ? (
              <div className="space-y-3">
                <div>
                  <Label>Project Name</Label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Enter project description"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label>Select Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projects.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">No existing projects found</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Artifacts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureParserPage;
