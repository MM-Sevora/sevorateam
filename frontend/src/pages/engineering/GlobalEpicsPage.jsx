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
  Target, ArrowRight, Plus, Layers, ChevronRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const GlobalEpicsPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [projects, setProjects] = useState([]);
  const [epicsData, setEpicsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchProjectsAndEpics = useCallback(async () => {
    try {
      setLoading(true);
      const projectsRes = await api.get('/projects/list');
      const projectsList = projectsRes.data || [];
      setProjects(projectsList);

      // Fetch epics for each project
      const epicsPromises = projectsList.map(async (project) => {
        try {
          const res = await api.get(`/engineering/projects/${project.id}/epics`);
          return { projectId: project.id, epics: res.data || [] };
        } catch {
          return { projectId: project.id, epics: [] };
        }
      });

      const results = await Promise.all(epicsPromises);
      const epicsMap = {};
      results.forEach(({ projectId, epics }) => {
        epicsMap[projectId] = epics;
      });
      setEpicsData(epicsMap);
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
        fetch(`${API}/api/departments`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/api/auth/users`, { headers }).then(r => r.ok ? r.json() : [])
      ]);
      setDepartments(deptRes || []);
      setUsers(usersRes || []);
    } catch (e) {
      console.error('Error fetching modal data:', e);
    }
  }, []);

  useEffect(() => {
    fetchProjectsAndEpics();
    fetchModalData();
  }, [fetchProjectsAndEpics, fetchModalData]);

  const getTotalEpics = () => {
    return Object.values(epicsData).reduce((sum, epics) => sum + epics.length, 0);
  };

  const getInProgressEpics = () => {
    return Object.values(epicsData).reduce((sum, epics) => 
      sum + epics.filter(e => e.status === 'in_progress').length, 0);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading epics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="global-epics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-violet-600" />
            Epics Overview
          </h1>
          <p className="text-gray-500 mt-1">
            Manage epics across all projects
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
            <div className="text-2xl font-bold text-gray-900">{getTotalEpics()}</div>
            <div className="text-sm text-gray-500">Total Epics</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{getInProgressEpics()}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(epicsData).reduce((sum, epics) => 
                sum + epics.filter(e => e.status === 'completed').length, 0)}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{projects.length}</div>
            <div className="text-sm text-gray-500">Projects</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects with Epics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Epics by Project</h2>
        
        {projects.map(project => {
          const projectEpics = epicsData[project.id] || [];
          
          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {/* Project Header */}
                <div 
                  className="p-4 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/projects/${project.id}/epics`)}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-violet-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{projectEpics.length} epics</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}/epics`);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Epic
                    </Button>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Epics List */}
                {projectEpics.length > 0 && (
                  <div className="divide-y">
                    {projectEpics.slice(0, 3).map(epic => (
                      <div 
                        key={epic.id}
                        className="p-4 pl-12 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}/epics`)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: epic.color || '#8B5CF6' }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{epic.name}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">{epic.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <Progress value={epic.progress || 0} className="h-2" />
                            <div className="text-xs text-gray-500 text-right mt-1">
                              {epic.progress || 0}%
                            </div>
                          </div>
                          <Badge className={
                            epic.status === 'completed' ? 'bg-green-100 text-green-700' :
                            epic.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {epic.status?.replace('_', ' ') || 'todo'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {projectEpics.length > 3 && (
                      <div 
                        className="p-3 pl-12 text-sm text-violet-600 hover:bg-violet-50 cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}/epics`)}
                      >
                        View all {projectEpics.length} epics <ChevronRight className="w-4 h-4 inline" />
                      </div>
                    )}
                  </div>
                )}

                {projectEpics.length === 0 && (
                  <div className="p-4 pl-12 text-sm text-gray-500">
                    No epics yet. <span 
                      className="text-violet-600 cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}/epics`);
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
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
              <p className="text-gray-500 mt-1 mb-4">
                Create a project first to start managing epics
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
          fetchProjectsAndEpics();
        }}
      />
    </div>
  );
};

export default GlobalEpicsPage;
