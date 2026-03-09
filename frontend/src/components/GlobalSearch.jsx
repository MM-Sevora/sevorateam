import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, FolderKanban, ListTodo, User, Calendar, 
  Flag, ChevronRight, Loader2, Command
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

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ projects: [], tasks: [] });
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

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
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({ projects: [], tasks: [] });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch projects and tasks in parallel
      const [projectsRes, tasksRes] = await Promise.all([
        fetch(`${API}/api/projects/list?search=${encodeURIComponent(searchQuery)}`, { headers }),
        fetch(`${API}/api/projects/tasks/all?search=${encodeURIComponent(searchQuery)}`, { headers })
      ]);

      const projects = projectsRes.ok ? await projectsRes.json() : [];
      const tasks = tasksRes.ok ? await tasksRes.json() : [];

      setResults({
        projects: projects.slice(0, 5),
        tasks: tasks.slice(0, 8)
      });
    } catch (error) {
      console.error('Search error:', error);
      setResults({ projects: [], tasks: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
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

  const totalResults = results.projects.length + results.tasks.length;
  const hasResults = totalResults > 0;

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
              placeholder="Search projects, tasks..."
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

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!query && (
              <div className="p-8 text-center text-[#6B5D52]">
                <Search className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                <p className="text-sm">Start typing to search projects and tasks</p>
                <p className="text-xs text-[#9C8C74] mt-1">Use Cmd+K or Ctrl+K to open anytime</p>
              </div>
            )}

            {query && !loading && !hasResults && (
              <div className="p-8 text-center text-[#6B5D52]">
                <Search className="w-12 h-12 mx-auto text-[#D4BBA6] mb-3" />
                <p className="text-sm">No results found for "{query}"</p>
                <p className="text-xs text-[#9C8C74] mt-1">Try a different search term</p>
              </div>
            )}

            {hasResults && (
              <div className="py-2">
                {/* Projects Section */}
                {results.projects.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-[#6B5D52] uppercase tracking-wider flex items-center gap-2">
                      <FolderKanban className="w-3.5 h-3.5" />
                      Projects ({results.projects.length})
                    </div>
                    {results.projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className="w-full px-4 py-3 hover:bg-[#FDF8F3] transition-colors flex items-center gap-3 group text-left"
                        data-testid={`search-result-project-${project.id}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                          <FolderKanban className="w-5 h-5 text-rose-600" />
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
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9C8C74] group-hover:text-rose-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Tasks Section */}
                {results.tasks.length > 0 && (
                  <div className={results.projects.length > 0 ? 'border-t border-[#E8D5C4]' : ''}>
                    <div className="px-4 py-2 text-xs font-semibold text-[#6B5D52] uppercase tracking-wider flex items-center gap-2">
                      <ListTodo className="w-3.5 h-3.5" />
                      Tasks ({results.tasks.length})
                    </div>
                    {results.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="w-full px-4 py-3 hover:bg-[#FDF8F3] transition-colors flex items-center gap-3 group text-left"
                        data-testid={`search-result-task-${task.id}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <ListTodo className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-[#4A3728] group-hover:text-rose-600 transition-colors truncate">
                              {task.name}
                            </span>
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
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9C8C74] group-hover:text-rose-600 transition-colors" />
                      </button>
                    ))}
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
            {hasResults && (
              <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
