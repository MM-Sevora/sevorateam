import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { toast } from 'sonner';
import { 
  Calendar, Users, MessageSquare, AlertTriangle, CheckCircle2, 
  Smile, Meh, Frown, Plus, ChevronLeft, ChevronRight, Clock,
  Target, Loader2, Send, ListTodo, AlertCircle
} from 'lucide-react';
import { format, parseISO, addDays, subDays, isToday } from 'date-fns';

const moodConfig = {
  happy: { icon: Smile, color: 'text-green-500', bg: 'bg-green-100', label: 'Happy' },
  neutral: { icon: Meh, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Neutral' },
  stressed: { icon: Frown, color: 'text-red-500', bg: 'bg-red-100', label: 'Stressed' }
};

const DailyStandupPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [teamEntries, setTeamEntries] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Entry form
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({
    yesterday: '',
    today: '',
    blockers: '',
    mood: 'neutral'
  });

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects/list');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [api]);

  const fetchTeamEntries = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const params = { date: dateStr };
      if (selectedProject) params.project_id = selectedProject;
      
      const response = await api.get('/engineering/standups/team', { params });
      setTeamEntries(response.data || []);
    } catch (error) {
      console.error('Error fetching team entries:', error);
    }
  }, [api, selectedDate, selectedProject]);

  const fetchMyEntry = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const params = { date: dateStr };
      if (selectedProject) params.project_id = selectedProject;
      
      const response = await api.get('/engineering/standups/my-entry', { params });
      setMyEntry(response.data);
      
      if (response.data) {
        setEntryForm({
          yesterday: response.data.yesterday || '',
          today: response.data.today || '',
          blockers: response.data.blockers || '',
          mood: response.data.mood || 'neutral'
        });
      }
    } catch (error) {
      console.error('Error fetching my entry:', error);
      setMyEntry(null);
    }
  }, [api, selectedDate, selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTeamEntries(), fetchMyEntry()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTeamEntries, fetchMyEntry]);

  const handleSubmitEntry = async () => {
    if (!entryForm.yesterday.trim() || !entryForm.today.trim()) {
      toast.error('Please fill in both Yesterday and Today fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/engineering/standups/entry', {
        ...entryForm,
        project_id: selectedProject || null,
        blockers: entryForm.blockers || null
      });
      
      toast.success('Standup submitted!');
      setShowEntryModal(false);
      await Promise.all([fetchTeamEntries(), fetchMyEntry()]);
    } catch (error) {
      toast.error('Failed to submit standup');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (direction) => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const blockersCount = teamEntries.filter(e => e.blockers).length;
  const participationRate = teamEntries.length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="daily-standup-page">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="hover:text-violet-600 cursor-pointer" onClick={() => navigate('/engineering/sprints')}>
          Engineering
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900">Daily Standup</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-600" />
            Daily Standup
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track team progress and blockers</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedProject || 'all'} onValueChange={(v) => setSelectedProject(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48" data-testid="project-filter">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {isToday(selectedDate) && (
            <Button 
              onClick={() => setShowEntryModal(true)} 
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="add-standup-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              {myEntry ? 'Update My Standup' : 'Add My Standup'}
            </Button>
          )}
        </div>
      </div>

      {/* Date Navigator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => handleDateChange('prev')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="text-center">
              <p className="text-lg font-semibold">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              {isToday(selectedDate) && (
                <Badge className="bg-green-100 text-green-700 mt-1">Today</Badge>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => handleDateChange('next')}
              disabled={isToday(selectedDate)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Participants</p>
                <p className="text-2xl font-bold">{participationRate}</p>
              </div>
              <Users className="w-8 h-8 text-violet-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Blockers</p>
                <p className="text-2xl font-bold text-red-600">{blockersCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Happy</p>
                <p className="text-2xl font-bold text-green-600">
                  {teamEntries.filter(e => e.mood === 'happy').length}
                </p>
              </div>
              <Smile className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Stressed</p>
                <p className="text-2xl font-bold text-amber-600">
                  {teamEntries.filter(e => e.mood === 'stressed').length}
                </p>
              </div>
              <Frown className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : teamEntries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No standups yet</h3>
            <p className="text-sm text-gray-500 mt-1">
              {isToday(selectedDate) 
                ? 'Be the first to share your standup today!' 
                : 'No standups were submitted on this day'}
            </p>
            {isToday(selectedDate) && (
              <Button 
                className="mt-4 bg-violet-600 hover:bg-violet-700"
                onClick={() => setShowEntryModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add My Standup
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {teamEntries.map(entry => {
            const MoodIcon = moodConfig[entry.mood]?.icon || Meh;
            const moodColor = moodConfig[entry.mood]?.color || 'text-gray-500';
            const moodBg = moodConfig[entry.mood]?.bg || 'bg-gray-100';
            
            return (
              <Card key={entry.id} className="hover:shadow-md transition-shadow" data-testid={`standup-entry-${entry.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* User Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-violet-100 text-violet-700">
                        {entry.user_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{entry.user_name}</span>
                          <Badge className={`${moodBg} ${moodColor}`}>
                            <MoodIcon className="w-3 h-3 mr-1" />
                            {moodConfig[entry.mood]?.label || 'Neutral'}
                          </Badge>
                          {entry.project_name && (
                            <Badge variant="outline">{entry.project_name}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(parseISO(entry.created_at), 'h:mm a')}
                        </span>
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Yesterday</p>
                          <p className="text-sm">{entry.yesterday}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Today</p>
                          <p className="text-sm">{entry.today}</p>
                        </div>
                        
                        {entry.blockers && (
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Blockers
                            </p>
                            <p className="text-sm text-red-700">{entry.blockers}</p>
                          </div>
                        )}
                        
                        {/* Auto-populated tasks */}
                        {entry.tasks_in_progress?.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <ListTodo className="w-3 h-3" />
                            <span>Working on: {entry.tasks_in_progress.map(t => t.name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Standup Modal */}
      <Dialog open={showEntryModal} onOpenChange={setShowEntryModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-600" />
              {myEntry ? 'Update My Standup' : 'Add My Standup'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">What did you do yesterday? *</label>
              <Textarea
                value={entryForm.yesterday}
                onChange={(e) => setEntryForm({ ...entryForm, yesterday: e.target.value })}
                placeholder="Completed feature X, fixed bug Y..."
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">What will you do today? *</label>
              <Textarea
                value={entryForm.today}
                onChange={(e) => setEntryForm({ ...entryForm, today: e.target.value })}
                placeholder="Working on feature Z, code review..."
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Any blockers?</label>
              <Textarea
                value={entryForm.blockers}
                onChange={(e) => setEntryForm({ ...entryForm, blockers: e.target.value })}
                placeholder="Waiting for API access, need design clarification..."
                rows={2}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">How are you feeling?</label>
              <div className="flex items-center gap-3 mt-2">
                {Object.entries(moodConfig).map(([mood, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={mood}
                      onClick={() => setEntryForm({ ...entryForm, mood })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        entryForm.mood === mood 
                          ? `${config.bg} border-current ${config.color}` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${entryForm.mood === mood ? config.color : 'text-gray-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntryModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitEntry} 
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Standup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyStandupPage;
