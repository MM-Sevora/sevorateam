import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Presentation, Users, Star, ThumbsUp, ThumbsDown, AlertCircle,
  Calendar, Video, Link2, Plus, Edit2, Trash2, Save, X, Loader2,
  ChevronRight, CheckCircle2, XCircle, Clock, MessageSquare, Send,
  Play, ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import api from '../../lib/api';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit2 },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700', icon: Clock },
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
      const res = await api.get(`/projects/sprints?project_id=${pid}`);
      setSprints(res.data || []);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
        <Button onClick={() => setShowCreateModal(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-1" />
          New Sprint Review
        </Button>
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
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setSelectedReview(review); setShowFeedbackModal(true); }}
                      className="text-violet-600"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Add Feedback
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleDeleteReview(review.id); }}
                      className="text-red-600 ml-auto"
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
    </div>
  );
};

export default SprintReviewPage;
