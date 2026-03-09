import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, FolderKanban, ListTodo, User, Calendar, 
  Flag, ChevronRight, Loader2, Command, AlertTriangle, Filter
} from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
} from './ui/dialog';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityColors = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-stone-100 text-stone-600'
};

const statusColors = {
  draft: 'bg-stone-100 text-stone-600',
  active: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-purple-100 text-purple-700',
  pending_review: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-stone-100 text-stone-500'
};

// Quick filter options
const FILTERS = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'my_tasks', label: 'My Tasks', icon: User },
  { id: 'overdue', label: 'Overdue', icon: AlertTriangle },
];

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ projects: [], tasks: [] });
  const [currentUserId, setCurrentUserId] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Get current user ID from token
  useEffect(() => {
    const token = localStorage.getItem('sevora_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub || payload.user_id || payload.id);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Search API call
  const performSearch = useCallback(async (searchQuery, filter) => {
    // For filter-only searches (no query), still perform search with empty query for specific filters
    const needsSearch = searchQuery?.length >= 2 || ['my_tasks', 'overdue'].includes(filter);
    
    if (!needsSearch && filter === 'all') {
      setResults({ projects: [], tasks: [] });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      let projects = [];
      let tasks = [];
      
      const searchParam = searchQuery ? `search=${encodeURIComponent(searchQuery)}` : '';

      // Fetch based on filter type
      if (filter === 'all' || filter === 'projects') {
        const projectsRes = await fetch(`${API}/api/projects/list?${searchParam}`, { headers });
        projects = projectsRes.ok ? await projectsRes.json() : [];
      }

      if (filter === 'all' || filter === 'tasks') {
        const tasksRes = await fetch(`${API}/api/projects/tasks/all?${searchParam}`, { headers });
        tasks = tasksRes.ok ? await tasksRes.json() : [];
      }

      if (filter === 'my_tasks') {
        // Fetch tasks assigned to current user
        const myTasksRes = await fetch(`${API}/api/projects/my-tasks`, { headers });
        if (myTasksRes.ok) {
          const myTasksData = await myTasksRes.json();
          tasks = [
            ...(myTasksData.tasks_overdue || []),
            ...(myTasksData.tasks_due_today || []),
            ...(myTasksData.tasks_in_progress || []),
            ...(myTasksData.tasks_pending_review || []),
            ...(myTasksData.tasks_assigned || [])
          ];
          // Filter by search query if provided
          if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            tasks = tasks.filter(t => 
              t.name?.toLowerCase().includes(lowerQuery) ||
              t.description?.toLowerCase().includes(lowerQuery)
            );
          }
        }
      }

      if (filter === 'overdue') {
        // Fetch overdue tasks
        const myTasksRes = await fetch(`${API}/api/projects/my-tasks`, { headers });
        if (myTasksRes.ok) {
          const myTasksData = await myTasksRes.json();
          tasks = myTasksData.tasks_overdue || [];
          // Filter by search query if provided
          if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            tasks = tasks.filter(t => 
              t.name?.toLowerCase().includes(lowerQuery) ||
              t.description?.toLowerCase().includes(lowerQuery)
            );
          }
        }
        // Also get at-risk projects
        const dashRes = await fetch(`${API}/api/projects/manager-dashboard`, { headers });
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          projects = dashData.at_risk_project_list || [];
          if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            projects = projects.filter(p => 
              p.name?.toLowerCase().includes(lowerQuery)
            );
          }
        }
      }

      // Apply limits based on filter
      const projectLimit = filter === 'projects' ? 10 : 5;
      const taskLimit = filter === 'tasks' || filter === 'my_tasks' || filter === 'overdue' ? 12 : 8;

      setResults({
        projects: projects.slice(0, projectLimit),
        tasks: tasks.slice(0, taskLimit)
      });
    } catch (error) {
      console.error('Search error:', error);
      setResults({ projects: [], tasks: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search - trigger on query or filter change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query, activeFilter);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, activeFilter, performSearch]);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setActiveFilter('all');
    setResults({ projects: [], tasks: [] });
  };

  const handleProjectClick = (project) => {
    handleClose();
    navigate(`/projects/${project.id}`);
  };

  const handleTaskClick = (task) => {
    handleClose();
    if (task.project_id) {
      navigate(`/projects/${task.project_id}?task=${task.id}`);
    } else {
      navigate(`/projects/my-tasks?task=${task.id}`);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // Determine what to show based on filter
  const showProjects = ['all', 'projects', 'overdue'].includes(activeFilter);
  const showTasks = ['all', 'tasks', 'my_tasks', 'overdue'].includes(activeFilter);
  
  const filteredProjects = showProjects ? results.projects : [];
  const filteredTasks = showTasks ? results.tasks : [];
  
  const totalResults = filteredProjects.length + filteredTasks.length;
  const hasResults = totalResults > 0;
  const showEmptyState = !query && activeFilter === 'all';
  const isFilterActive = activeFilter !== 'all';

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#F5EBE0] hover:bg-[#E8D5C4] rounded-lg border border-[#D4BBA6] transition-colors min-w-[200px]"
        data-testid="global-search-trigger"
      >
        <Search className="w-4 h-4 text-[#6B5D52]" />
        <span className="text-sm text-[#6B5D52] flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded border border-[#D4BBA6] text-[10px] text-[#6B5D52] font-mono">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 bg-white overflow-hidden [&>button]:hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8D5C4]">
            <Search className="w-5 h-5 text-[#6B5D52] flex-shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={activeFilter === 'all' ? "Search projects, tasks..." : `Search ${FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 text-base px-0 h-auto py-1 placeholder:text-[#9C8C74]"
              data-testid="global-search-input"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-[#F5EBE0] rounded"
              >
                <X className="w-4 h-4 text-[#6B5D52]" />
              </button>
            )}
            {loading && <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E8D5C4] bg-[#FDF8F3] overflow-x-auto">
            <Filter className="w-4 h-4 text-[#9C8C74] flex-shrink-0" />
            {FILTERS.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'bg-white text-[#4A3728] border border-[#D4BBA6] hover:border-rose-400 hover:bg-rose-50'
                  }`}
                  data-testid={`filter-${filter.id}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${filter.id === 'overdue' && isActive ? 'text-white' : filter.id === 'overdue' ? 'text-red-500' : ''}`} />
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Results */}
          <div className="max-h-[55vh] overflow-y-auto">
            {showEmptyState && !loading && (
              <div className="p-8 text-center text-[#6B5D52]">
                <Search className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                <p className="text-sm">Start typing to search projects and tasks</p>
                <p className="text-xs text-[#9C8C74] mt-1">Or use filters to browse your work</p>
              </div>
            )}

            {!showEmptyState && !loading && !hasResults && (
              <div className="p-8 text-center text-[#6B5D52]">
                <Search className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                <p className="text-sm">
                  {query ? `No results found for "${query}"` : `No ${FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase()} found`}
                </p>
                <p className="text-xs text-[#9C8C74] mt-1">
                  {query ? 'Try a different search term or filter' : 'Try a different filter'}
                </p>
              </div>
            )}

            {hasResults && (
              <div className="py-2">
                {/* Projects Section */}
                {filteredProjects.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-[#6B5D52] uppercase tracking-wider flex items-center gap-2">
                      <FolderKanban className="w-3.5 h-3.5" />
                      {activeFilter === 'overdue' ? 'At-Risk Projects' : 'Projects'} ({filteredProjects.length})
                    </div>
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className="w-full px-4 py-3 hover:bg-[#FDF8F3] transition-colors flex items-center gap-3 group text-left"
                        data-testid={`search-result-project-${project.id}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          activeFilter === 'overdue' ? 'bg-red-100' : 'bg-rose-100'
                        }`}>
                          <FolderKanban className={`w-5 h-5 ${activeFilter === 'overdue' ? 'text-red-600' : 'text-rose-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-[#4A3728] group-hover:text-rose-600 transition-colors truncate">
                              {project.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-[#F5EBE0] text-[#5D4A3A] border-[#D4BBA6]">
                              {project.project_id}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#6B5D52]">
                            <Badge variant="outline" className={`text-[10px] ${statusColors[project.status] || statusColors.draft}`}>
                              {project.status?.replace('_', ' ')}
                            </Badge>
                            <span>{project.task_count || 0} tasks</span>
                            <span>{project.progress?.toFixed(0) || 0}% done</span>
                            {project.overdue_task_count > 0 && (
                              <span className="text-red-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {project.overdue_task_count} overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9C8C74] group-hover:text-rose-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Tasks Section */}
                {filteredTasks.length > 0 && (
                  <div className={filteredProjects.length > 0 ? 'border-t border-[#E8D5C4]' : ''}>
                    <div className="px-4 py-2 text-xs font-semibold text-[#6B5D52] uppercase tracking-wider flex items-center gap-2">
                      <ListTodo className="w-3.5 h-3.5" />
                      {activeFilter === 'my_tasks' ? 'My Tasks' : activeFilter === 'overdue' ? 'Overdue Tasks' : 'Tasks'} ({filteredTasks.length})
                    </div>
                    {filteredTasks.map((task) => {
                      const taskIsOverdue = isOverdue(task.due_date) && !['completed', 'approved'].includes(task.status);
                      return (
                        <button
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className="w-full px-4 py-3 hover:bg-[#FDF8F3] transition-colors flex items-center gap-3 group text-left"
                          data-testid={`search-result-task-${task.id}`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            taskIsOverdue ? 'bg-red-100' : 'bg-purple-100'
                          }`}>
                            <ListTodo className={`w-5 h-5 ${taskIsOverdue ? 'text-red-600' : 'text-purple-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-[#4A3728] group-hover:text-rose-600 transition-colors truncate">
                                {task.name}
                              </span>
                              {taskIsOverdue && (
                                <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-200">
                                  <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#6B5D52] flex-wrap">
                              <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority] || priorityColors.medium}`}>
                                <Flag className="w-2.5 h-2.5 mr-1" />
                                {task.priority}
                              </Badge>
                              {task.project_name && (
                                <span className="flex items-center gap-1">
                                  <FolderKanban className="w-3 h-3" />
                                  {task.project_name}
                                </span>
                              )}
                              {task.assigned_to_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {task.assigned_to_name}
                                </span>
                              )}
                              {task.due_date && (
                                <span className={`flex items-center gap-1 ${taskIsOverdue ? 'text-red-600 font-medium' : ''}`}>
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#9C8C74] group-hover:text-rose-600 transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#E8D5C4] bg-[#FDF8F3] text-xs text-[#6B5D52] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#D4BBA6] text-[10px] font-mono">↵</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#D4BBA6] text-[10px] font-mono">esc</kbd>
                to close
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isFilterActive && (
                <span className="text-rose-600 font-medium">
                  Filter: {FILTERS.find(f => f.id === activeFilter)?.label}
                </span>
              )}
              {hasResults && (
                <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
