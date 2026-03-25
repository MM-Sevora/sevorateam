import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { toast } from 'sonner';
import { 
  ThumbsUp, ThumbsDown, Lightbulb, Plus, Check, Trash2, 
  ChevronRight, Calendar, Users, Target, Edit, MessageSquare,
  Loader2, CheckCircle, Clock, AlertCircle, ArrowUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const columnConfig = {
  went_well: {
    title: 'What Went Well',
    icon: ThumbsUp,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700'
  },
  didnt_go_well: {
    title: "What Didn't Go Well",
    icon: ThumbsDown,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700'
  },
  action_item: {
    title: 'Action Items',
    icon: Lightbulb,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700'
  }
};

const SprintRetroPage = () => {
  const { sprintId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  
  const [sprint, setSprint] = useState(null);
  const [retro, setRetro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // New item form
  const [newItemType, setNewItemType] = useState(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  
  // Notes modal
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Select sprint modal (if no sprintId)
  const [showSprintSelector, setShowSprintSelector] = useState(false);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');

  const fetchSprint = useCallback(async () => {
    if (!sprintId) return;
    try {
      const response = await api.get(`/projects/sprints/${sprintId}`);
      setSprint(response.data);
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
    }
  }, [api, sprintId]);

  const fetchRetro = useCallback(async () => {
    if (!sprintId) return;
    try {
      const response = await api.get(`/engineering/retros/sprint/${sprintId}`);
      setRetro(response.data);
      if (response.data?.notes) {
        setNotes(response.data.notes);
      }
    } catch (error) {
      console.error('Failed to fetch retro:', error);
      setRetro(null);
    }
  }, [api, sprintId]);

  const fetchSprints = useCallback(async () => {
    try {
      // Get completed sprints that might need retros
      const response = await api.get('/projects/sprints/list');
      const completedSprints = (response.data || []).filter(
        s => s.status === 'completed' || s.status === 'active'
      );
      setSprints(completedSprints);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (sprintId) {
        await Promise.all([fetchSprint(), fetchRetro()]);
      } else {
        await fetchSprints();
        setShowSprintSelector(true);
      }
      setLoading(false);
    };
    loadData();
  }, [sprintId, fetchSprint, fetchRetro, fetchSprints]);

  const handleCreateRetro = async () => {
    if (!sprintId) return;
    
    setCreating(true);
    try {
      await api.post('/engineering/retros', { sprint_id: sprintId });
      toast.success('Retrospective created!');
      await fetchRetro();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create retrospective');
    } finally {
      setCreating(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemType || !newItemContent.trim()) return;
    
    setAddingItem(true);
    try {
      await api.post('/engineering/retros/items', {
        sprint_id: sprintId,
        item_type: newItemType,
        content: newItemContent.trim()
      });
      toast.success('Item added!');
      setNewItemType(null);
      setNewItemContent('');
      await fetchRetro();
    } catch (error) {
      toast.error('Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleVote = async (itemId) => {
    try {
      await api.post(`/engineering/retros/items/${itemId}/vote`);
      await fetchRetro();
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const handleToggleResolved = async (itemId, currentStatus) => {
    try {
      await api.put(`/engineering/retros/items/${itemId}`, {
        is_resolved: !currentStatus
      });
      await fetchRetro();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/engineering/retros/items/${itemId}`);
      toast.success('Item deleted');
      await fetchRetro();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.put(`/engineering/retros/${retro.id}`, { notes });
      toast.success('Notes saved');
      setShowNotesModal(false);
      await fetchRetro();
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCompleteRetro = async () => {
    try {
      await api.post(`/engineering/retros/${retro.id}/complete`);
      toast.success('Retrospective marked as complete!');
      await fetchRetro();
    } catch (error) {
      toast.error('Failed to complete retrospective');
    }
  };

  const handleSelectSprint = () => {
    if (selectedSprintId) {
      navigate(`/engineering/retro/${selectedSprintId}`);
      setShowSprintSelector(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Sprint selector modal when no sprint selected
  if (!sprintId || showSprintSelector) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-600" />
              Select Sprint for Retrospective
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a sprint..." />
              </SelectTrigger>
              <SelectContent>
                {sprints.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      {s.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {s.status === 'active' && <Clock className="w-4 h-4 text-blue-500" />}
                      <span>{s.name}</span>
                      <span className="text-xs text-gray-500">({s.project_name})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleSelectSprint} 
              disabled={!selectedSprintId}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              Start Retrospective
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="sprint-retro-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="hover:text-violet-600 cursor-pointer" onClick={() => navigate('/engineering')}>
              Engineering
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="hover:text-violet-600 cursor-pointer" onClick={() => navigate('/engineering/sprints')}>
              Sprints
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Retrospective</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-violet-600" />
            Sprint Retrospective
          </h1>
          {sprint && (
            <p className="text-sm text-gray-500 mt-1">
              {sprint.name} • {sprint.project_name}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {retro && !retro.completed_at && (
            <>
              <Button variant="outline" onClick={() => setShowNotesModal(true)}>
                <Edit className="w-4 h-4 mr-2" /> Notes
              </Button>
              <Button 
                onClick={handleCompleteRetro}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" /> Complete Retro
              </Button>
            </>
          )}
          {retro?.completed_at && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed {format(parseISO(retro.completed_at), 'MMM d, yyyy')}
            </Badge>
          )}
        </div>
      </div>

      {/* Create Retro CTA if none exists */}
      {!retro && (
        <Card className="border-dashed border-2 border-violet-200">
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-violet-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No retrospective yet</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Start a retrospective to capture team feedback and action items
            </p>
            <Button 
              onClick={handleCreateRetro}
              disabled={creating}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Plus className="w-4 h-4 mr-2" /> Start Retrospective
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Retro Stats */}
      {retro && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Items</p>
                  <p className="text-2xl font-bold">{retro.total_items}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Votes</p>
                  <p className="text-2xl font-bold text-violet-600">{retro.total_votes}</p>
                </div>
                <ArrowUp className="w-8 h-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Action Items</p>
                  <p className="text-2xl font-bold">{retro.action_items_total}</p>
                </div>
                <Lightbulb className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-lg font-semibold">
                    {retro.action_items_resolved}/{retro.action_items_total}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
              <Progress 
                value={retro.action_items_total > 0 
                  ? (retro.action_items_resolved / retro.action_items_total) * 100 
                  : 0
                } 
                className="h-1.5"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Three Column Layout */}
      {retro && (
        <div className="grid grid-cols-3 gap-6">
          {Object.entries(columnConfig).map(([type, config]) => {
            const Icon = config.icon;
            const items = type === 'went_well' ? retro.went_well 
              : type === 'didnt_go_well' ? retro.didnt_go_well 
              : retro.action_items;
            
            return (
              <Card key={type} className={`${config.borderColor} border-t-4`}>
                <CardHeader className={`${config.bgColor} rounded-t-lg pb-3`}>
                  <CardTitle className={`text-sm font-medium flex items-center gap-2 ${config.textColor}`}>
                    <Icon className="w-4 h-4" />
                    {config.title} ({items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2 min-h-[300px]">
                  {/* Existing items */}
                  {items.map(item => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow ${
                        item.is_resolved ? 'opacity-60' : ''
                      }`}
                    >
                      <p className={`text-sm ${item.is_resolved ? 'line-through text-gray-400' : ''}`}>
                        {item.content}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2"
                            onClick={() => handleVote(item.id)}
                          >
                            <ArrowUp className="w-3 h-3 mr-1" />
                            {item.votes}
                          </Button>
                          
                          {type === 'action_item' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 px-2 ${item.is_resolved ? 'text-green-600' : ''}`}
                              onClick={() => handleToggleResolved(item.id, item.is_resolved)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-xs bg-gray-100">
                              {item.created_by_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add new item */}
                  {newItemType === type ? (
                    <div className="p-3 rounded-lg border-2 border-dashed border-violet-200 bg-violet-50">
                      <Textarea
                        value={newItemContent}
                        onChange={(e) => setNewItemContent(e.target.value)}
                        placeholder={`Add ${config.title.toLowerCase()}...`}
                        rows={2}
                        className="mb-2"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleAddItem}
                          disabled={addingItem || !newItemContent.trim()}
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          {addingItem && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Add
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setNewItemType(null);
                            setNewItemContent('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full border-2 border-dashed hover:border-violet-300 hover:bg-violet-50"
                      onClick={() => setNewItemType(type)}
                      disabled={!!retro.completed_at}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Notes if present */}
      {retro?.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Edit className="w-4 h-4 text-gray-500" />
              Meeting Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{retro.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Retrospective Notes</DialogTitle>
            <DialogDescription>
              Add meeting notes, decisions, or additional context
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Meeting notes, key decisions, follow-ups..."
            rows={8}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {savingNotes && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SprintRetroPage;
