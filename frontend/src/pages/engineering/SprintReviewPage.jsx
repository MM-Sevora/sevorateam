import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Presentation, Users, Star, ThumbsUp, ThumbsDown, AlertCircle,
  Calendar, Video, Link2, Plus, Edit2, Trash2, Save, X, Loader2,
  ChevronRight, CheckCircle2, XCircle, Clock, MessageSquare, Send,
  Play, ExternalLink, Command, UserPlus, ClipboardCheck, ArrowRight,
  Archive, RotateCcw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit2 },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700', icon: Clock },
  reviewed: { label: 'Reviewed', color: 'bg-violet-100 text-violet-700', icon: ClipboardCheck },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  needs_changes: { label: 'Needs Changes', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

const SprintReviewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const sprintId = searchParams.get('sprint');

  const [reviews, setReviews] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCloseSprintModal, setShowCloseSprintModal] = useState(false);
  const [pendingTasksData, setPendingTasksData] = useState(null);
  const [closeSprintLoading, setCloseSprintLoading] = useState(false);

  // Create modal state
  const [createForm, setCreateForm] = useState({
    sprint_id: sprintId || '',
    project_id: projectId || '',
    title: '',
    summary: '',
    demo_items: [],
    stakeholder_ids: []
  });

  // Feedback modal state
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    feedback: '',
    approval_status: 'pending'
  });

  // Invite stakeholders state
  const [inviteForm, setInviteForm] = useState({
    stakeholder_ids: [],
    custom_message: '',
    send_notification: true
  });

  // Close sprint state
  const [closeSprintForm, setCloseSprintForm] = useState({
    pending_task_action: 'backlog',
    target_sprint_id: '',
    mark_as_reviewed: true
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+n': () => setShowCreateModal(true),
    'escape': () => {
      setShowCreateModal(false);
      setShowFeedbackModal(false);
      setShowInviteModal(false);
      setShowCloseSprintModal(false);
    }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reviewsRes, projectsRes, usersRes] = await Promise.all([
        api.get(`/engineering/sprint-reviews${projectId ? `?project_id=${projectId}` : ''}`),
        api.get('/projects/list'),
        api.get('/workos/users')
      ]);
      setReviews(reviewsRes.data || []);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load sprint reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchSprintsForProject = async (pid) => {
    try {
      const res = await api.get(`/projects/${pid}/sprints`);
      setSprints(res.data || []);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
      setSprints([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (createForm.project_id) {
      fetchSprintsForProject(createForm.project_id);
    }
  }, [createForm.project_id]);

  const handleCreateReview = async () => {
    if (!createForm.sprint_id || !createForm.project_id) {
      toast.error('Please select a project and sprint');
      return;
    }

    try {
      await api.post('/engineering/sprint-reviews', createForm);
      toast.success('Sprint review created');
      setShowCreateModal(false);
      setCreateForm({ sprint_id: '', project_id: '', title: '', summary: '', demo_items: [], stakeholder_ids: [] });
      fetchData();
    } catch (error) {
      console.error('Failed to create review:', error);
      toast.error('Failed to create sprint review');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedReview) return;

    try {
      await api.post(
        `/engineering/sprint-reviews/${selectedReview.id}/feedback`,
        null,
        { params: feedbackForm }
      );
      toast.success('Feedback submitted');
      setShowFeedbackModal(false);
      setFeedbackForm({ rating: 0, feedback: '', approval_status: 'pending' });
      fetchData();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this sprint review?')) return;

    try {
      await api.delete(`/engineering/sprint-reviews/${reviewId}`);
      toast.success('Sprint review deleted');
      fetchData();
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete sprint review');
    }
  };

  const addDemoItem = () => {
    setCreateForm(prev => ({
      ...prev,
      demo_items: [...prev.demo_items, { task_name: '', demo_notes: '', presenter_id: '' }]
    }));
  };

  const updateDemoItem = (index, field, value) => {
    setCreateForm(prev => ({
      ...prev,
      demo_items: prev.demo_items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removeDemoItem = (index) => {
    setCreateForm(prev => ({
      ...prev,
      demo_items: prev.demo_items.filter((_, i) => i !== index)
    }));
  };

  const toggleStakeholder = (userId) => {
    setCreateForm(prev => ({
      ...prev,
      stakeholder_ids: prev.stakeholder_ids.includes(userId)
        ? prev.stakeholder_ids.filter(id => id !== userId)
        : [...prev.stakeholder_ids, userId]
    }));
  };

  const toggleInviteStakeholder = (userId) => {
    setInviteForm(prev => ({
      ...prev,
      stakeholder_ids: prev.stakeholder_ids.includes(userId)
        ? prev.stakeholder_ids.filter(id => id !== userId)
        : [...prev.stakeholder_ids, userId]
    }));
  };

  const handleInviteStakeholders = async () => {
    if (!selectedReview || inviteForm.stakeholder_ids.length === 0) {
      toast.error('Please select at least one stakeholder');
      return;
    }

    try {
      const res = await api.post(`/engineering/sprint-reviews/${selectedReview.id}/invite-stakeholders`, {
        stakeholder_ids: inviteForm.stakeholder_ids,
        send_notification: inviteForm.send_notification,
        custom_message: inviteForm.custom_message || null
      });
      toast.success(res.data.message || 'Stakeholders invited');
      setShowInviteModal(false);
      setInviteForm({ stakeholder_ids: [], custom_message: '', send_notification: true });
      fetchData();
    } catch (error) {
      console.error('Failed to invite stakeholders:', error);
      toast.error('Failed to invite stakeholders');
    }
  };

  const handleMarkAsReviewed = async (reviewId) => {
    try {
      await api.post(`/engineering/sprint-reviews/${reviewId}/mark-reviewed`);
      toast.success('Sprint review marked as reviewed');
      fetchData();
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
      toast.error('Failed to mark as reviewed');
    }
  };

  const openCloseSprintModal = async (review) => {
    setSelectedReview(review);
    try {
      const res = await api.get(`/projects/sprints/${review.sprint_id}/pending-tasks`);
      setPendingTasksData(res.data);
      setCloseSprintForm({
        pending_task_action: 'backlog',
        target_sprint_id: '',
        mark_as_reviewed: true
      });
      setShowCloseSprintModal(true);
    } catch (error) {
      console.error('Failed to fetch pending tasks:', error);
      toast.error('Failed to load pending tasks');
    }
  };

  const handleCloseSprint = async () => {
    if (!selectedReview || !pendingTasksData) return;
    
    if (closeSprintForm.pending_task_action === 'next_sprint' && !closeSprintForm.target_sprint_id) {
      toast.error('Please select a target sprint');
      return;
    }

    setCloseSprintLoading(true);
    try {
      const res = await api.post(`/projects/sprints/${selectedReview.sprint_id}/close`, {
        pending_task_action: closeSprintForm.pending_task_action,
        target_sprint_id: closeSprintForm.pending_task_action === 'next_sprint' ? closeSprintForm.target_sprint_id : null,
        mark_as_reviewed: closeSprintForm.mark_as_reviewed
      });
      
      toast.success(`Sprint closed! ${res.data.tasks_moved || 0} tasks moved to ${res.data.moved_to || 'nowhere'}`);
      setShowCloseSprintModal(false);
      setPendingTasksData(null);
      fetchData();
    } catch (error) {
      console.error('Failed to close sprint:', error);
      toast.error(error.response?.data?.detail || 'Failed to close sprint');
    } finally {
      setCloseSprintLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="hover:text-violet-600 cursor-pointer" onClick={() => navigate('/engineering/sprints')}>
          Engineering
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">Sprint Reviews</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Presentation className="w-6 h-6 text-violet-600" />
            Sprint Reviews
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Demo completed work, gather stakeholder feedback, and track approvals
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setShowCreateModal(true)} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-1" />
                New Sprint Review
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="flex items-center gap-1">
                <Command className="w-3 h-3" />
                <span>Ctrl+N</span>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Reviews Grid */}
      {reviews.length === 0 ? (
        <Card className="p-12 text-center">
          <Presentation className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sprint Reviews Yet</h3>
          <p className="text-gray-500 mb-4">Create your first sprint review to demo completed work to stakeholders.</p>
          <Button onClick={() => setShowCreateModal(true)} variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Create Sprint Review
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map(review => {
            const status = STATUS_CONFIG[review.status] || STATUS_CONFIG.draft;
            const StatusIcon = status.icon;

            return (
              <Card key={review.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReview(review)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {review.title || `Sprint Review: ${review.sprint_name}`}
                    </CardTitle>
                    <Badge className={`${status.color} text-xs`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{review.project_name} / {review.sprint_name}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Demo Items */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Play className="w-4 h-4" />
                    <span>{review.demo_items?.length || 0} demos</span>
                  </div>

                  {/* Stakeholder Feedback */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{review.approval_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                      <ThumbsDown className="w-4 h-4" />
                      <span>{review.rejection_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{review.pending_count || 0} pending</span>
                    </div>
                  </div>

                  {/* Rating */}
                  {review.overall_rating && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= review.overall_rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-1">({review.overall_rating.toFixed(1)})</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-2 border-t border-gray-100 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setSelectedReview(review); setShowFeedbackModal(true); }}
                      className="text-violet-600"
                      data-testid={`feedback-btn-${review.id}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Feedback
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setSelectedReview(review); setShowInviteModal(true); }}
                      className="text-blue-600"
                      data-testid={`invite-btn-${review.id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Invite
                    </Button>
                    {review.status !== 'reviewed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleMarkAsReviewed(review.id); }}
                        className="text-green-600"
                        data-testid={`mark-reviewed-btn-${review.id}`}
                      >
                        <ClipboardCheck className="w-4 h-4 mr-1" />
                        Mark Reviewed
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); openCloseSprintModal(review); }}
                      className="text-orange-600"
                      data-testid={`close-sprint-btn-${review.id}`}
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      Close Sprint
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleDeleteReview(review.id); }}
                      className="text-red-600 ml-auto"
                      data-testid={`delete-btn-${review.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Sprint Review Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Presentation className="w-5 h-5 text-violet-600" />
              Create Sprint Review
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project & Sprint Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Project</label>
                <Select value={createForm.project_id} onValueChange={(v) => setCreateForm(p => ({ ...p, project_id: v, sprint_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sprint</label>
                <Select value={createForm.sprint_id} onValueChange={(v) => setCreateForm(p => ({ ...p, sprint_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select sprint" /></SelectTrigger>
                  <SelectContent>
                    {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title & Summary */}
            <div>
              <label className="text-sm font-medium text-gray-700">Review Title</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Sprint 5 - User Authentication Features"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Summary</label>
              <Textarea
                value={createForm.summary}
                onChange={(e) => setCreateForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="Brief overview of what was accomplished this sprint..."
                rows={3}
              />
            </div>

            {/* Demo Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Demo Items</label>
                <Button size="sm" variant="outline" onClick={addDemoItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Demo
                </Button>
              </div>
              {createForm.demo_items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.task_name}
                      onChange={(e) => updateDemoItem(idx, 'task_name', e.target.value)}
                      placeholder="Feature/Task name"
                    />
                    <Textarea
                      value={item.demo_notes}
                      onChange={(e) => updateDemoItem(idx, 'demo_notes', e.target.value)}
                      placeholder="Demo notes..."
                      rows={2}
                    />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeDemoItem(idx)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Stakeholders */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Invite Stakeholders</label>
              <div className="flex flex-wrap gap-2">
                {users.filter(u => u.role === 'stakeholder' || u.role === 'admin').map(user => (
                  <button
                    key={user.id}
                    onClick={() => toggleStakeholder(user.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      createForm.stakeholder_ids.includes(user.id)
                        ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {user.name || user.email}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateReview} className="bg-violet-600 hover:bg-violet-700">
              Create Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Feedback Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-600" />
              Submit Feedback
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Rating */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setFeedbackForm(p => ({ ...p, rating: star }))}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= feedbackForm.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Text */}
            <div>
              <label className="text-sm font-medium text-gray-700">Feedback</label>
              <Textarea
                value={feedbackForm.feedback}
                onChange={(e) => setFeedbackForm(p => ({ ...p, feedback: e.target.value }))}
                placeholder="Your comments on this sprint review..."
                rows={4}
              />
            </div>

            {/* Approval Status */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Decision</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'approved', label: 'Approve', icon: ThumbsUp, color: 'text-green-600 border-green-200 bg-green-50' },
                  { value: 'needs_changes', label: 'Needs Changes', icon: AlertCircle, color: 'text-amber-600 border-amber-200 bg-amber-50' },
                  { value: 'rejected', label: 'Reject', icon: ThumbsDown, color: 'text-red-600 border-red-200 bg-red-50' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFeedbackForm(p => ({ ...p, approval_status: opt.value }))}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      feedbackForm.approval_status === opt.value
                        ? `${opt.color} ring-2 ring-offset-2`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitFeedback} className="bg-violet-600 hover:bg-violet-700">
              <Send className="w-4 h-4 mr-1" />
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Stakeholders Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Invite Stakeholders
            </DialogTitle>
            <DialogDescription>
              Invite additional stakeholders to review {selectedReview?.title || selectedReview?.sprint_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Select Stakeholders */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Stakeholders</label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {users.filter(u => 
                  !selectedReview?.stakeholder_ids?.includes(u.id) &&
                  (u.role === 'stakeholder' || u.role === 'admin' || u.role === 'manager')
                ).map(user => (
                  <button
                    key={user.id}
                    onClick={() => toggleInviteStakeholder(user.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      inviteForm.stakeholder_ids.includes(user.id)
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    data-testid={`invite-user-${user.id}`}
                  >
                    {user.name || user.email}
                  </button>
                ))}
                {users.filter(u => !selectedReview?.stakeholder_ids?.includes(u.id)).length === 0 && (
                  <p className="text-sm text-gray-500 p-2">All available users are already invited</p>
                )}
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="text-sm font-medium text-gray-700">Custom Message (Optional)</label>
              <Textarea
                value={inviteForm.custom_message}
                onChange={(e) => setInviteForm(p => ({ ...p, custom_message: e.target.value }))}
                placeholder="Add a personal message to the invitation..."
                rows={3}
              />
            </div>

            {/* Send Notification Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="send-notification"
                checked={inviteForm.send_notification}
                onChange={(e) => setInviteForm(p => ({ ...p, send_notification: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="send-notification" className="text-sm text-gray-700">
                Send notification to invited stakeholders
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button 
              onClick={handleInviteStakeholders} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={inviteForm.stakeholder_ids.length === 0}
              data-testid="send-invites-btn"
            >
              <Send className="w-4 h-4 mr-1" />
              Send Invites ({inviteForm.stakeholder_ids.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Sprint Modal */}
      <Dialog open={showCloseSprintModal} onOpenChange={setShowCloseSprintModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-orange-600" />
              Close Sprint
            </DialogTitle>
            <DialogDescription>
              Complete the sprint and decide what to do with pending tasks
            </DialogDescription>
          </DialogHeader>

          {pendingTasksData && (
            <div className="space-y-4 py-4">
              {/* Pending Tasks Summary */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {pendingTasksData.pending_count} pending task{pendingTasksData.pending_count !== 1 ? 's' : ''} in this sprint
                  </span>
                </div>
                {pendingTasksData.pending_count > 0 && (
                  <ul className="text-sm text-amber-600 ml-7 list-disc max-h-32 overflow-y-auto">
                    {pendingTasksData.pending_tasks.slice(0, 5).map(task => (
                      <li key={task.id}>{task.name} ({task.status})</li>
                    ))}
                    {pendingTasksData.pending_count > 5 && (
                      <li>...and {pendingTasksData.pending_count - 5} more</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Pending Task Action */}
              {pendingTasksData.pending_count > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    What should happen to pending tasks?
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="pending_action"
                        value="backlog"
                        checked={closeSprintForm.pending_task_action === 'backlog'}
                        onChange={(e) => setCloseSprintForm(p => ({ ...p, pending_task_action: e.target.value }))}
                      />
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <RotateCcw className="w-4 h-4 text-gray-600" />
                          Move to Backlog
                        </div>
                        <p className="text-sm text-gray-500">Return tasks to the project backlog for future planning</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="pending_action"
                        value="next_sprint"
                        checked={closeSprintForm.pending_task_action === 'next_sprint'}
                        onChange={(e) => setCloseSprintForm(p => ({ ...p, pending_task_action: e.target.value }))}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                          Move to Another Sprint
                        </div>
                        <p className="text-sm text-gray-500">Carry tasks over to an existing sprint</p>
                        {closeSprintForm.pending_task_action === 'next_sprint' && (
                          <Select 
                            value={closeSprintForm.target_sprint_id} 
                            onValueChange={(v) => setCloseSprintForm(p => ({ ...p, target_sprint_id: v }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select target sprint" />
                            </SelectTrigger>
                            <SelectContent>
                              {pendingTasksData.available_target_sprints?.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} ({s.status})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="pending_action"
                        value="keep"
                        checked={closeSprintForm.pending_task_action === 'keep'}
                        onChange={(e) => setCloseSprintForm(p => ({ ...p, pending_task_action: e.target.value }))}
                      />
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <Archive className="w-4 h-4 text-orange-600" />
                          Keep in This Sprint
                        </div>
                        <p className="text-sm text-gray-500">Leave tasks in the completed sprint (for reference)</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Mark as Reviewed */}
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id="mark-reviewed"
                  checked={closeSprintForm.mark_as_reviewed}
                  onChange={(e) => setCloseSprintForm(p => ({ ...p, mark_as_reviewed: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="mark-reviewed" className="text-sm text-gray-700">
                  <span className="font-medium">Mark sprint as reviewed</span>
                  <p className="text-gray-500">Indicates that stakeholders have reviewed the sprint demo</p>
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseSprintModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCloseSprint} 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={closeSprintLoading}
              data-testid="close-sprint-confirm-btn"
            >
              {closeSprintLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-1" />
              )}
              Close Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SprintReviewPage;
