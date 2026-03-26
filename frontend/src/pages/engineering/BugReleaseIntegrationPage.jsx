import React, { useState, useEffect } from 'react';
import { 
  Bug, Package, GitBranch, ArrowRight, CheckCircle2, Circle, 
  AlertTriangle, Loader2, Plus, Search, Filter, RefreshCw,
  Calendar, Target, Users, TrendingUp, Clock, XCircle, ChevronRight,
  Link2, Unlink, Play, Rocket, Shield, Eye
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import api from '../../lib/api';

const BUG_STATUS_CONFIG = {
  reported: { label: 'Reported', color: 'bg-gray-100 text-gray-700', icon: Bug },
  triaged: { label: 'Triaged', color: 'bg-blue-100 text-blue-700', icon: Target },
  in_sprint: { label: 'In Sprint', color: 'bg-purple-100 text-purple-700', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Play },
  fixed: { label: 'Fixed', color: 'bg-orange-100 text-orange-700', icon: GitBranch },
  verified: { label: 'Verified', color: 'bg-teal-100 text-teal-700', icon: Shield },
  released: { label: 'Released', color: 'bg-green-100 text-green-700', icon: Rocket },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
  wont_fix: { label: "Won't Fix", color: 'bg-red-100 text-red-700', icon: XCircle }
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white' },
  high: { label: 'High', color: 'bg-orange-500 text-white' },
  medium: { label: 'Medium', color: 'bg-yellow-500 text-white' },
  low: { label: 'Low', color: 'bg-blue-500 text-white' }
};

const WORKFLOW_STAGES = ['reported', 'triaged', 'in_sprint', 'in_progress', 'fixed', 'verified', 'released'];

const BugReleaseIntegrationPage = () => {
  const [workflowData, setWorkflowData] = useState(null);
  const [releases, setReleases] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [releaseBugs, setReleaseBugs] = useState(null);
  
  // Link bug modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ bug_task_id: '', release_id: '', sprint_id: '' });
  const [availableBugs, setAvailableBugs] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const projectFilter = selectedProject && selectedProject !== 'all' ? `?project_id=${selectedProject}` : '';
      const [workflowRes, releasesRes, projectsRes] = await Promise.all([
        api.get(`/engineering/bugs/workflow-status${projectFilter}`),
        api.get('/projects/releases'),
        api.get('/projects/list')
      ]);
      setWorkflowData(workflowRes.data);
      setReleases(releasesRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load bug workflow data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSprintsForProject = async (projectId) => {
    try {
      const res = await api.get(`/projects/sprints?project_id=${projectId}`);
      setSprints(res.data || []);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    }
  };

  const fetchReleaseBugs = async (releaseId) => {
    try {
      const res = await api.get(`/engineering/releases/${releaseId}/bugs`);
      setReleaseBugs(res.data);
    } catch (error) {
      console.error('Failed to fetch release bugs:', error);
      toast.error('Failed to load release bugs');
    }
  };

  const fetchAvailableBugs = async () => {
    try {
      // Get bugs that aren't yet linked to a release
      const res = await api.get('/projects/tasks/all?issue_type=bug&limit=100');
      const bugs = res.data?.filter(b => !b.linked_release_id) || [];
      setAvailableBugs(bugs);
    } catch (error) {
      console.error('Failed to fetch bugs:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject]);

  useEffect(() => {
    if (selectedRelease) {
      fetchReleaseBugs(selectedRelease.id);
    }
  }, [selectedRelease]);

  const handleLinkBugToRelease = async () => {
    if (!linkForm.bug_task_id || !linkForm.release_id) {
      toast.error('Please select a bug and release');
      return;
    }

    try {
      await api.post('/engineering/bugs/link-to-release', linkForm);
      toast.success('Bug linked to release');
      setShowLinkModal(false);
      setLinkForm({ bug_task_id: '', release_id: '', sprint_id: '' });
      fetchData();
      if (selectedRelease) {
        fetchReleaseBugs(selectedRelease.id);
      }
    } catch (error) {
      console.error('Failed to link bug:', error);
      toast.error(error.response?.data?.detail || 'Failed to link bug to release');
    }
  };

  const handleUpdateBugStatus = async (bugId, newStatus) => {
    try {
      await api.put(`/engineering/bugs/${bugId}/status?status=${newStatus}`);
      toast.success('Bug status updated');
      fetchData();
      if (selectedRelease) {
        fetchReleaseBugs(selectedRelease.id);
      }
    } catch (error) {
      console.error('Failed to update bug status:', error);
      toast.error('Failed to update bug status');
    }
  };

  const handleVerifyBug = async (releaseId, bugId, verified) => {
    try {
      await api.post(`/engineering/releases/${releaseId}/verify-bug/${bugId}?verified=${verified}`);
      toast.success(verified ? 'Bug verified' : 'Verification removed');
      fetchReleaseBugs(releaseId);
      fetchData();
    } catch (error) {
      console.error('Failed to verify bug:', error);
      toast.error('Failed to verify bug');
    }
  };

  const handleMarkReleased = async (releaseId) => {
    if (!window.confirm('Mark this release as released? All verified bugs will be updated to "Released" status.')) return;

    try {
      await api.post(`/engineering/releases/${releaseId}/mark-released`);
      toast.success('Release marked as released');
      fetchData();
      if (selectedRelease?.id === releaseId) {
        fetchReleaseBugs(releaseId);
      }
    } catch (error) {
      console.error('Failed to mark release:', error);
      toast.error('Failed to mark release as released');
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bug className="w-6 h-6 text-red-500" />
            Bug + Release Integration
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track bugs through the full lifecycle: Report → Triage → Sprint → Fix → Release
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { fetchAvailableBugs(); setShowLinkModal(true); }} className="bg-violet-600 hover:bg-violet-700">
            <Link2 className="w-4 h-4 mr-1" />
            Link Bug to Release
          </Button>
        </div>
      </div>

      {/* Bug Workflow Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-600" />
            Bug Workflow Pipeline
          </CardTitle>
          <CardDescription>
            Visual overview of bugs across all workflow stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {WORKFLOW_STAGES.map((stage, idx) => {
              const config = BUG_STATUS_CONFIG[stage];
              const count = workflowData?.counts?.[stage] || 0;
              const bugs = workflowData?.workflow?.[stage] || [];
              const Icon = config.icon;

              return (
                <React.Fragment key={stage}>
                  <div className="flex-1 min-w-[140px]">
                    <div className={`p-4 rounded-lg border-2 border-dashed ${count > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`${config.color} text-xs`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-lg font-bold text-gray-900">{count}</span>
                      </div>
                      {count > 0 && (
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {bugs.slice(0, 3).map(bug => (
                            <div key={bug.id} className="text-xs text-gray-600 truncate" title={bug.name}>
                              {bug.name}
                            </div>
                          ))}
                          {bugs.length > 3 && (
                            <div className="text-xs text-gray-400">+{bugs.length - 3} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <ChevronRight className="w-6 h-6 text-gray-400 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Releases with Bugs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Release List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Releases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {releases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p>No releases found</p>
              </div>
            ) : (
              releases.map(release => (
                <div
                  key={release.id}
                  onClick={() => setSelectedRelease(release)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedRelease?.id === release.id 
                      ? 'border-violet-300 bg-violet-50 ring-2 ring-violet-200' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{release.name}</h4>
                    <Badge className={release.status === 'released' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                      {release.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{release.project_name}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      <Bug className="w-4 h-4 inline mr-1" />
                      {release.linked_bugs?.length || 0} bugs
                    </span>
                    {release.release_date && (
                      <span className="text-gray-500">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {new Date(release.release_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Selected Release Bugs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bug className="w-5 h-5 text-red-500" />
                {selectedRelease ? `Bugs in ${selectedRelease.name}` : 'Select a Release'}
              </CardTitle>
              {selectedRelease && releaseBugs && selectedRelease.status !== 'released' && (
                <Button 
                  size="sm" 
                  onClick={() => handleMarkReleased(selectedRelease.id)}
                  disabled={releaseBugs.bugs_verified === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Rocket className="w-4 h-4 mr-1" />
                  Mark Released
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRelease ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p>Select a release to view linked bugs</p>
              </div>
            ) : releaseBugs ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">{releaseBugs.bugs_total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div className="p-2 bg-orange-50 rounded">
                    <div className="text-lg font-bold text-orange-600">{releaseBugs.bugs_fixed}</div>
                    <div className="text-xs text-gray-500">Fixed</div>
                  </div>
                  <div className="p-2 bg-teal-50 rounded">
                    <div className="text-lg font-bold text-teal-600">{releaseBugs.bugs_verified}</div>
                    <div className="text-xs text-gray-500">Verified</div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded">
                    <div className="text-lg font-bold text-yellow-600">{releaseBugs.bugs_pending}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verification Progress</span>
                    <span className="font-medium">
                      {releaseBugs.bugs_total > 0 
                        ? Math.round((releaseBugs.bugs_verified / releaseBugs.bugs_total) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={releaseBugs.bugs_total > 0 ? (releaseBugs.bugs_verified / releaseBugs.bugs_total) * 100 : 0}
                    className="h-2"
                  />
                </div>

                {/* Bug List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {releaseBugs.bugs?.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      No bugs linked to this release
                    </div>
                  ) : (
                    releaseBugs.bugs?.map(bug => {
                      const statusConfig = BUG_STATUS_CONFIG[bug.bug_status] || BUG_STATUS_CONFIG.reported;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <div key={bug.bug_id} className="p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 text-sm">{bug.bug_name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`${statusConfig.color} text-xs`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                                {bug.severity && (
                                  <Badge className={`${SEVERITY_CONFIG[bug.severity]?.color || 'bg-gray-500 text-white'} text-xs`}>
                                    {bug.severity}
                                  </Badge>
                                )}
                              </div>
                              {bug.sprint_name && (
                                <p className="text-xs text-gray-500 mt-1">Sprint: {bug.sprint_name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {bug.bug_status === 'fixed' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleVerifyBug(selectedRelease.id, bug.bug_id, true)}
                                  className="text-teal-600 hover:text-teal-700"
                                >
                                  <Shield className="w-4 h-4 mr-1" />
                                  Verify
                                </Button>
                              )}
                              {bug.bug_status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateBugStatus(bug.bug_id, 'fixed')}
                                  className="text-orange-600"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Mark Fixed
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Link Bug to Release Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-violet-600" />
              Link Bug to Release
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Bug Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700">Bug</label>
              <Select value={linkForm.bug_task_id} onValueChange={(v) => setLinkForm(p => ({ ...p, bug_task_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bug" />
                </SelectTrigger>
                <SelectContent>
                  {availableBugs.map(bug => (
                    <SelectItem key={bug.id} value={bug.id}>
                      <span className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        {bug.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableBugs.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No unlinked bugs available</p>
              )}
            </div>

            {/* Release Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700">Target Release</label>
              <Select 
                value={linkForm.release_id} 
                onValueChange={(v) => {
                  const release = releases.find(r => r.id === v);
                  setLinkForm(p => ({ ...p, release_id: v }));
                  if (release?.project_id) {
                    fetchSprintsForProject(release.project_id);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a release" />
                </SelectTrigger>
                <SelectContent>
                  {releases.filter(r => r.status !== 'released').map(release => (
                    <SelectItem key={release.id} value={release.id}>
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        {release.name} ({release.project_name})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sprint Selection (Optional) */}
            <div>
              <label className="text-sm font-medium text-gray-700">Sprint for Fix (Optional)</label>
              <Select value={linkForm.sprint_id || "none"} onValueChange={(v) => setLinkForm(p => ({ ...p, sprint_id: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sprint (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sprint</SelectItem>
                  {sprints.map(sprint => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Optionally assign the bug to a sprint for fixing</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkModal(false)}>Cancel</Button>
            <Button onClick={handleLinkBugToRelease} className="bg-violet-600 hover:bg-violet-700">
              <Link2 className="w-4 h-4 mr-1" />
              Link to Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BugReleaseIntegrationPage;
