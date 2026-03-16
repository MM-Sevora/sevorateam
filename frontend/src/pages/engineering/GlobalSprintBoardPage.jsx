import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { 
  Zap, ArrowRight, Play, Calendar, Target, Clock, CheckCircle2
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const GlobalSprintBoardPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [projects, setProjects] = useState([]);
  const [sprintsData, setSprintsData] = useState({});
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchProjectsAndSprints();
  }, [fetchProjectsAndSprints]);

  const getActiveSprints = () => {
    let active = [];
    Object.entries(sprintsData).forEach(([projectId, sprints]) => {
      const project = projects.find(p => p.id === projectId);
      sprints.filter(s => s.status === 'active').forEach(sprint => {
        active.push({ ...sprint, project });
      });
    });
    return active;
  };

  const activeSprints = getActiveSprints();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sprints...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="global-sprint-board-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-violet-600" />
            Sprint Board
          </h1>
          <p className="text-gray-500 mt-1">
            View and manage active sprints across all projects
          </p>
        </div>
      </div>

      {/* Active Sprints */}
      {activeSprints.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active Sprints
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {activeSprints.map(sprint => (
              <Card 
                key={sprint.id}
                className="border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/projects/${sprint.project?.id}/sprint-board`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-green-100 text-green-700">
                      <Play className="w-3 h-3 mr-1" /> Active
                    </Badge>
                    <span className="text-sm text-gray-500">{sprint.project?.name}</span>
                  </div>
                  
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                    {sprint.name}
                  </h3>
                  
                  {sprint.goal && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{sprint.goal}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {sprint.start_date && format(parseISO(sprint.start_date), 'MMM d')} - {sprint.end_date && format(parseISO(sprint.end_date), 'MMM d')}
                    </span>
                    {sprint.end_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.max(0, differenceInDays(parseISO(sprint.end_date), new Date()))} days left
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4 text-violet-600" />
                        {sprint.completed_points || 0} / {sprint.total_points || 0} pts
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        {sprint.completed_tasks || 0} / {sprint.total_tasks || 0} tasks
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 transition-colors" />
                  </div>
                  
                  {sprint.total_points > 0 && (
                    <div className="mt-3">
                      <Progress 
                        value={(sprint.completed_points / sprint.total_points) * 100} 
                        className="h-2" 
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Select a Project</h2>
        <div className="grid grid-cols-3 gap-4">
          {projects.map(project => {
            const projectSprints = sprintsData[project.id] || [];
            const activeSprint = projectSprints.find(s => s.status === 'active');
            const planningSprints = projectSprints.filter(s => s.status === 'planning').length;
            
            return (
              <Card 
                key={project.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/projects/${project.id}/sprint-board`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    {activeSprint && (
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-3">
                    {projectSprints.length} sprint{projectSprints.length !== 1 ? 's' : ''}
                    {planningSprints > 0 && ` • ${planningSprints} planning`}
                  </div>
                  
                  {activeSprint ? (
                    <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 text-sm">
                        <Play className="w-3 h-3 text-green-600" />
                        <span className="font-medium text-green-700 truncate">{activeSprint.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No active sprint</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {projects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
              <p className="text-gray-500 mt-1 mb-4">
                Create a project first to start using sprint boards
              </p>
              <Button onClick={() => navigate('/engineering/projects')}>
                Go to Projects
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GlobalSprintBoardPage;
