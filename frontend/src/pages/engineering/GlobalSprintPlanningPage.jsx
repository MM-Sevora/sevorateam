import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { CreateProjectModal } from '../projects/ProjectsList';
import { 
  Zap, ArrowRight, Plus, Calendar, Target, Clock, CheckCircle2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const GlobalSprintPlanningPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [projects, setProjects] = useState([]);
  const [sprintsData, setSprintsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchProjectsAndSprints = useCallback(async () => {
    try {
      setLoading(true);
      const projectsRes = await api.get('/projects/list');
      const projectsList = projectsRes.data || [];
      setProjects(projectsList);

      // Fetch sprints for each project
      const sprintsPromises = projectsList.map(async (project) => {
        try {
          const res = await api.get(`/projects/${project.id}/sprints`);
          return { projectId: project.id, sprints: res.data || [] };
        } catch {
          return { projectId: project.id, sprints: [] };
        }
      });

      const results = await Promise.all(sprintsPromises);
      const sprintsMap = {};
      results.forEach(({ projectId, sprints }) => {
        sprintsMap[projectId] = sprints;
      });
      setSprintsData(sprintsMap);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchModalData = useCallback(async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [deptRes, usersRes] = await Promise.all([
        fetch(`${API}/api/workos/departments`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/api/workos/users`, { headers }).then(r => r.ok ? r.json() : { users: [] })
      ]);
      setDepartments(deptRes || []);
      const allUsers = usersRes.users || usersRes || [];
      setUsers(allUsers.filter(u => u.status === 'active'));
    } catch (e) {
      console.error('Error fetching modal data:', e);
    }
  }, []);

  useEffect(() => {
    fetchProjectsAndSprints();
    fetchModalData();
  }, [fetchProjectsAndSprints, fetchModalData]);

  const getActiveSprints = () => {
    return Object.values(sprintsData).reduce((sum, sprints) => 
      sum + sprints.filter(s => s.status === 'active').length, 0);
  };

  const getPlannedSprints = () => {
    return Object.values(sprintsData).reduce((sum, sprints) => 
      sum + sprints.filter(s => s.status === 'planning').length, 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sprints...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="global-sprint-planning-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-violet-600" />
            Sprint Planning
          </h1>
          <p className="text-gray-500 mt-1">
            Plan and manage sprints across all projects
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{getActiveSprints()}</div>
            <div className="text-sm text-gray-500">Active Sprints</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{getPlannedSprints()}</div>
            <div className="text-sm text-gray-500">Planning</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {Object.values(sprintsData).reduce((sum, sprints) => 
                sum + sprints.filter(s => s.status === 'completed').length, 0)}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-violet-600">{projects.length}</div>
            <div className="text-sm text-gray-500">Projects</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sprints Highlight */}
      {getActiveSprints() > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active Sprints
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {projects.map(project => {
              const activeSprints = (sprintsData[project.id] || []).filter(s => s.status === 'active');
              return activeSprints.map(sprint => (
                <Card 
                  key={sprint.id} 
                  className="border-green-200 bg-green-50/50 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/engineering/projects/${project.id}/sprint-planning`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                      <span className="text-sm text-gray-500">{project.name}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{sprint.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {sprint.story_points || 0} pts
                      </span>
                    </div>
                    <Progress value={sprint.progress || 0} className="h-2" />
                    <div className="text-xs text-gray-500 text-right mt-1">{sprint.progress || 0}% complete</div>
                  </CardContent>
                </Card>
              ));
            })}
          </div>
        </div>
      )}

      {/* All Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">All Projects</h2>
        
        {projects.map(project => {
          const projectSprints = sprintsData[project.id] || [];
          
          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {/* Project Header */}
                <div 
                  className="p-4 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/engineering/projects/${project.id}/sprint-planning`)}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-violet-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">
                        {projectSprints.filter(s => s.status === 'active').length} active, {' '}
                        {projectSprints.filter(s => s.status === 'planning').length} planning
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}/sprints`);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> New Sprint
                    </Button>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Sprints Preview */}
                {projectSprints.length > 0 && (
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {projectSprints.slice(0, 3).map(sprint => (
                      <div 
                        key={sprint.id}
                        className="p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        onClick={() => navigate(`/engineering/projects/${project.id}/sprint-planning`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900 truncate">{sprint.name}</span>
                          <Badge className={
                            sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                            sprint.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                            sprint.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                            'bg-gray-100 text-gray-600'
                          } variant="outline">
                            {sprint.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {projectSprints.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">
                    No sprints yet. <span 
                      className="text-violet-600 cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}/sprints`);
                      }}
                    >Create one</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {projects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
              <p className="text-gray-500 mt-1 mb-4">
                Create a project first to start sprint planning
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Project Modal - Full Version */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        modules={[]}
        departments={departments}
        users={users}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchProjectsAndSprints();
        }}
      />
    </div>
  );
};

export default GlobalSprintPlanningPage;
