import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    Calendar,
    CalendarRange,
    Loader2,
    RefreshCw,
    Plus,
    CheckCircle,
    AlertTriangle,
    Target,
    Users,
    X,
    Send,
} from 'lucide-react';

export default function WorkUpdates() {
    const { api, user } = useAuth();
    const [dailyUpdates, setDailyUpdates] = useState([]);
    const [weeklyUpdates, setWeeklyUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDailyDialog, setShowDailyDialog] = useState(false);
    const [showWeeklyDialog, setShowWeeklyDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filterDepartment, setFilterDepartment] = useState('all');

    const [dailyForm, setDailyForm] = useState({
        completed_tasks: [''],
        blockers: [''],
        tomorrow_focus: [''],
        notes: '',
    });

    const [weeklyForm, setWeeklyForm] = useState({
        achievements: [''],
        issues_faced: [''],
        next_week_focus: [''],
        team_highlights: [''],
        notes: '',
    });

    const DEPARTMENTS = ['marketing', 'buying', 'warehouse', 'technology', 'operations', 'finance', 'hr', 'sales', 'leadership'];

    useEffect(() => {
        fetchUpdates();
    }, [filterDepartment]);

    const fetchUpdates = async () => {
        setLoading(true);
        try {
            const deptParam = filterDepartment !== 'all' ? `?department=${filterDepartment}` : '';
            const [dailyRes, weeklyRes] = await Promise.all([
                api.get(`/pulse/updates/daily${deptParam}`),
                api.get(`/pulse/updates/weekly${deptParam}`),
            ]);
            setDailyUpdates(dailyRes.data.updates || []);
            setWeeklyUpdates(weeklyRes.data.updates || []);
        } catch (error) {
            console.error('Failed to fetch updates:', error);
            toast.error('Failed to load updates');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitDaily = async () => {
        const cleanedTasks = dailyForm.completed_tasks.filter(t => t.trim());
        if (cleanedTasks.length === 0) {
            toast.error('Please add at least one completed task');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/pulse/updates/daily', {
                completed_tasks: cleanedTasks,
                blockers: dailyForm.blockers.filter(b => b.trim()),
                tomorrow_focus: dailyForm.tomorrow_focus.filter(t => t.trim()),
                notes: dailyForm.notes || null,
            });
            toast.success('Daily update submitted!');
            setShowDailyDialog(false);
            setDailyForm({
                completed_tasks: [''],
                blockers: [''],
                tomorrow_focus: [''],
                notes: '',
            });
            fetchUpdates();
        } catch (error) {
            toast.error('Failed to submit daily update');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitWeekly = async () => {
        const cleanedAchievements = weeklyForm.achievements.filter(a => a.trim());
        if (cleanedAchievements.length === 0) {
            toast.error('Please add at least one achievement');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/pulse/updates/weekly', {
                achievements: cleanedAchievements,
                issues_faced: weeklyForm.issues_faced.filter(i => i.trim()),
                next_week_focus: weeklyForm.next_week_focus.filter(f => f.trim()),
                team_highlights: weeklyForm.team_highlights.filter(h => h.trim()),
                notes: weeklyForm.notes || null,
            });
            toast.success('Weekly update submitted!');
            setShowWeeklyDialog(false);
            setWeeklyForm({
                achievements: [''],
                issues_faced: [''],
                next_week_focus: [''],
                team_highlights: [''],
                notes: '',
            });
            fetchUpdates();
        } catch (error) {
            toast.error('Failed to submit weekly update');
        } finally {
            setSubmitting(false);
        }
    };

    const addListItem = (formType, field) => {
        if (formType === 'daily') {
            setDailyForm({ ...dailyForm, [field]: [...dailyForm[field], ''] });
        } else {
            setWeeklyForm({ ...weeklyForm, [field]: [...weeklyForm[field], ''] });
        }
    };

    const updateListItem = (formType, field, index, value) => {
        if (formType === 'daily') {
            const updated = [...dailyForm[field]];
            updated[index] = value;
            setDailyForm({ ...dailyForm, [field]: updated });
        } else {
            const updated = [...weeklyForm[field]];
            updated[index] = value;
            setWeeklyForm({ ...weeklyForm, [field]: updated });
        }
    };

    const removeListItem = (formType, field, index) => {
        if (formType === 'daily') {
            const updated = dailyForm[field].filter((_, i) => i !== index);
            setDailyForm({ ...dailyForm, [field]: updated.length ? updated : [''] });
        } else {
            const updated = weeklyForm[field].filter((_, i) => i !== index);
            setWeeklyForm({ ...weeklyForm, [field]: updated.length ? updated : [''] });
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const ListInput = ({ formType, field, items, placeholder, icon: Icon }) => (
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <Input
                        value={item}
                        onChange={(e) => updateListItem(formType, field, idx, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1"
                    />
                    {items.length > 1 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeListItem(formType, field, idx)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ))}
            <Button
                variant="outline"
                size="sm"
                onClick={() => addListItem(formType, field)}
                className="w-full"
            >
                <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto" data-testid="work-updates-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Work Updates</h1>
                    <p className="text-gray-500 mt-1">Track daily and weekly progress across teams</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {DEPARTMENTS.map(d => (
                                <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchUpdates}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="daily" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="daily" className="gap-2">
                            <Calendar className="w-4 h-4" />
                            Daily Updates
                        </TabsTrigger>
                        <TabsTrigger value="weekly" className="gap-2">
                            <CalendarRange className="w-4 h-4" />
                            Weekly Updates
                        </TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowDailyDialog(true)}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Calendar className="w-4 h-4" />
                            Submit Daily
                        </Button>
                        <Button
                            onClick={() => setShowWeeklyDialog(true)}
                            className="gap-2 bg-violet-600 hover:bg-violet-700"
                        >
                            <CalendarRange className="w-4 h-4" />
                            Submit Weekly
                        </Button>
                    </div>
                </div>

                {/* Daily Updates Tab */}
                <TabsContent value="daily">
                    {dailyUpdates.length === 0 ? (
                        <Card className="py-12">
                            <CardContent className="text-center">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-700">No daily updates yet</h3>
                                <p className="text-gray-500 mt-1">Submit your first daily update!</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {dailyUpdates.map(update => (
                                <Card key={update.id}>
                                    <CardContent className="p-5">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="w-10 h-10">
                                                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                                    {getInitials(update.user_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-medium">{update.user_name}</span>
                                                    <Badge variant="outline" className="capitalize">{update.department}</Badge>
                                                    <span className="text-sm text-gray-500">{formatDate(update.date)}</span>
                                                </div>
                                                
                                                {/* Completed Tasks */}
                                                <div className="mb-3">
                                                    <h4 className="text-sm font-medium text-emerald-700 flex items-center gap-1 mb-1">
                                                        <CheckCircle className="w-4 h-4" /> Completed
                                                    </h4>
                                                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                        {update.completed_tasks?.map((task, i) => (
                                                            <li key={i}>{task}</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Blockers */}
                                                {update.blockers?.length > 0 && update.blockers[0] && (
                                                    <div className="mb-3">
                                                        <h4 className="text-sm font-medium text-red-700 flex items-center gap-1 mb-1">
                                                            <AlertTriangle className="w-4 h-4" /> Blockers
                                                        </h4>
                                                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                            {update.blockers?.map((blocker, i) => (
                                                                <li key={i}>{blocker}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Tomorrow Focus */}
                                                {update.tomorrow_focus?.length > 0 && update.tomorrow_focus[0] && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-blue-700 flex items-center gap-1 mb-1">
                                                            <Target className="w-4 h-4" /> Tomorrow's Focus
                                                        </h4>
                                                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                            {update.tomorrow_focus?.map((focus, i) => (
                                                                <li key={i}>{focus}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Weekly Updates Tab */}
                <TabsContent value="weekly">
                    {weeklyUpdates.length === 0 ? (
                        <Card className="py-12">
                            <CardContent className="text-center">
                                <CalendarRange className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-700">No weekly updates yet</h3>
                                <p className="text-gray-500 mt-1">Submit your first weekly update!</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {weeklyUpdates.map(update => (
                                <Card key={update.id}>
                                    <CardContent className="p-5">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="w-10 h-10">
                                                <AvatarFallback className="bg-violet-100 text-violet-700">
                                                    {getInitials(update.user_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-medium">{update.user_name}</span>
                                                    <Badge variant="outline" className="capitalize">{update.department}</Badge>
                                                    <span className="text-sm text-gray-500">Week of {update.week_start}</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Achievements */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-violet-700 flex items-center gap-1 mb-1">
                                                            <CheckCircle className="w-4 h-4" /> Achievements
                                                        </h4>
                                                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                            {update.achievements?.map((item, i) => (
                                                                <li key={i}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Team Highlights */}
                                                    {update.team_highlights?.length > 0 && update.team_highlights[0] && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-blue-700 flex items-center gap-1 mb-1">
                                                                <Users className="w-4 h-4" /> Team Highlights
                                                            </h4>
                                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                                {update.team_highlights?.map((item, i) => (
                                                                    <li key={i}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Issues */}
                                                    {update.issues_faced?.length > 0 && update.issues_faced[0] && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-red-700 flex items-center gap-1 mb-1">
                                                                <AlertTriangle className="w-4 h-4" /> Challenges
                                                            </h4>
                                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                                {update.issues_faced?.map((item, i) => (
                                                                    <li key={i}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Next Week */}
                                                    {update.next_week_focus?.length > 0 && update.next_week_focus[0] && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-emerald-700 flex items-center gap-1 mb-1">
                                                                <Target className="w-4 h-4" /> Next Week Focus
                                                            </h4>
                                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                                {update.next_week_focus?.map((item, i) => (
                                                                    <li key={i}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Daily Update Dialog */}
            <Dialog open={showDailyDialog} onOpenChange={setShowDailyDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                            Submit Daily Update
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div>
                            <label className="text-sm font-medium mb-2 block text-emerald-700">
                                What did you complete today? *
                            </label>
                            <ListInput
                                formType="daily"
                                field="completed_tasks"
                                items={dailyForm.completed_tasks}
                                placeholder="Completed task..."
                                icon={CheckCircle}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block text-red-700">
                                Any blockers?
                            </label>
                            <ListInput
                                formType="daily"
                                field="blockers"
                                items={dailyForm.blockers}
                                placeholder="Blocker or challenge..."
                                icon={AlertTriangle}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block text-blue-700">
                                Tomorrow's focus
                            </label>
                            <ListInput
                                formType="daily"
                                field="tomorrow_focus"
                                items={dailyForm.tomorrow_focus}
                                placeholder="Priority for tomorrow..."
                                icon={Target}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                            <Textarea
                                value={dailyForm.notes}
                                onChange={(e) => setDailyForm({ ...dailyForm, notes: e.target.value })}
                                placeholder="Any additional notes..."
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDailyDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitDaily}
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Weekly Update Dialog */}
            <Dialog open={showWeeklyDialog} onOpenChange={setShowWeeklyDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarRange className="w-5 h-5 text-violet-500" />
                            Submit Weekly Update
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div>
                            <label className="text-sm font-medium mb-2 block text-violet-700">
                                Key achievements this week *
                            </label>
                            <ListInput
                                formType="weekly"
                                field="achievements"
                                items={weeklyForm.achievements}
                                placeholder="Achievement..."
                                icon={CheckCircle}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block text-blue-700">
                                Team highlights
                            </label>
                            <ListInput
                                formType="weekly"
                                field="team_highlights"
                                items={weeklyForm.team_highlights}
                                placeholder="Team highlight..."
                                icon={Users}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block text-red-700">
                                Challenges faced
                            </label>
                            <ListInput
                                formType="weekly"
                                field="issues_faced"
                                items={weeklyForm.issues_faced}
                                placeholder="Challenge or issue..."
                                icon={AlertTriangle}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block text-emerald-700">
                                Next week focus
                            </label>
                            <ListInput
                                formType="weekly"
                                field="next_week_focus"
                                items={weeklyForm.next_week_focus}
                                placeholder="Priority for next week..."
                                icon={Target}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                            <Textarea
                                value={weeklyForm.notes}
                                onChange={(e) => setWeeklyForm({ ...weeklyForm, notes: e.target.value })}
                                placeholder="Any additional notes..."
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWeeklyDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitWeekly}
                            disabled={submitting}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
