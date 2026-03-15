import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Layers, Target, ChevronRight, Filter, ArrowRight
} from 'lucide-react';

// Redirect to project-specific backlog or show project selector
const GlobalBacklogPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects/list');
        setProjects(response.data || []);
        // Auto-redirect to first project's backlog if only one project
        if (response.data?.length === 1) {
          navigate(`/projects/${response.data[0].id}/backlog`);
        }
      } catch (error) {
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [api, navigate]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" data-testid="global-backlog-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-600" />
          Product Backlog
        </h1>
        <p className="text-gray-500 mt-1">
          Select a project to view and manage its backlog
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {projects.map(project => (
          <Card 
            key={project.id}
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(`/projects/${project.id}/backlog`)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {project.task_count || 0} tasks • {project.completed_task_count || 0} completed
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{project.status}</Badge>
                    <Badge className="bg-purple-100 text-purple-700">{project.priority}</Badge>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
            <p className="text-gray-500 mt-1 mb-4">
              Create a project first to start managing your backlog
            </p>
            <Button onClick={() => navigate('/projects/list')}>
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GlobalBacklogPage;
