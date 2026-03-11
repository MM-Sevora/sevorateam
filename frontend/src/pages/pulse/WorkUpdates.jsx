import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../../components/ui/popover';
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
    Search,
    User,
    LayoutGrid,
    List,
    Link2,
    FolderKanban,
    ListTodo,
    ExternalLink,
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
    const [filterEmployee, setFilterEmployee] = useState('all');
    const [employees, setEmployees] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'team'
    const [searchQuery, setSearchQuery] = useState('');
    
    // Linkable items state
    const [linkableItems, setLinkableItems] = useState([]);
    const [linkableLoading, setLinkableLoading] = useState(false);
    const [linkSearch, setLinkSearch] = useState('');

    // Updated form state to support linked items for ALL fields
    const [dailyForm, setDailyForm] = useState({
        completed_items: [{ text: '', linked_item: null }],
        blocker_items: [{ text: '', linked_item: null }],
        tomorrow_focus_items: [{ text: '', linked_item: null }],
        notes: '',
    });

    const [weeklyForm, setWeeklyForm] = useState({
        achievement_items: [{ text: '', linked_item: null }],
        issues_faced_items: [{ text: '', linked_item: null }],
        next_week_focus_items: [{ text: '', linked_item: null }],
        team_highlights_items: [{ text: '', linked_item: null }],
        notes: '',
    });

    const DEPARTMENTS = ['marketing', 'buying', 'warehouse', 'technology', 'operations', 'finance', 'hr', 'sales', 'leadership'];
    
    // Check if user is manager/admin
    const isManager = ['super_admin', 'admin', 'department_manager', 'team_lead'].includes(user?.role);

    // Fetch linkable items (tasks/projects)
    const fetchLinkableItems = useCallback(async (search = '') => {
        setLinkableLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('limit', '30');
            
            const response = await api.get(`/pulse/updates/linkable-items?${params}`);
            setLinkableItems(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch linkable items:', error);
        } finally {
            setLinkableLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchUpdates();
        if (isManager) {
            fetchEmployees();
        }
    }, [filterDepartment, filterEmployee]);
    
    // Fetch linkable items when dialog opens
    useEffect(() => {
        if (showDailyDialog || showWeeklyDialog) {
            fetchLinkableItems();
        }
    }, [showDailyDialog, showWeeklyDialog, fetchLinkableItems]);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/admin/users');
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const fetchUpdates = async () => {
        setLoading(true);
        try {
            let dailyParams = [];
            let weeklyParams = [];
            
            if (filterDepartment && filterDepartment !== 'all') {
                dailyParams.push(`department=${filterDepartment}`);
                weeklyParams.push(`department=${filterDepartment}`);
            }
            if (filterEmployee && filterEmployee !== 'all') {
                dailyParams.push(`user_id=${filterEmployee}`);
                weeklyParams.push(`user_id=${filterEmployee}`);
            }
            
            const dailyQuery = dailyParams.length > 0 ? `?${dailyParams.join('&')}` : '';
            const weeklyQuery = weeklyParams.length > 0 ? `?${weeklyParams.join('&')}` : '';
            
            const [dailyRes, weeklyRes] = await Promise.all([
                api.get(`/pulse/updates/daily${dailyQuery}`),
                api.get(`/pulse/updates/weekly${weeklyQuery}`),
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
        const validItems = dailyForm.completed_items.filter(item => item.text.trim());
        if (validItems.length === 0) {
            toast.error('Please add at least one completed task');
            return;
        }

        // Helper to format items for API
        const formatItems = (items) => items.filter(item => item.text.trim()).map(item => ({
            text: item.text,
            linked_item: item.linked_item,
            completion_date: item.linked_item?.due_date || null,
        }));

        setSubmitting(true);
        try {
            await api.post('/pulse/updates/daily', {
                completed_items: formatItems(dailyForm.completed_items),
                blocker_items: formatItems(dailyForm.blocker_items),
                tomorrow_focus_items: formatItems(dailyForm.tomorrow_focus_items),
                notes: dailyForm.notes || null,
            });
            toast.success('Daily update submitted!');
            setShowDailyDialog(false);
            setDailyForm({
                completed_items: [{ text: '', linked_item: null }],
                blocker_items: [{ text: '', linked_item: null }],
                tomorrow_focus_items: [{ text: '', linked_item: null }],
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
        const validItems = weeklyForm.achievement_items.filter(item => item.text.trim());
        if (validItems.length === 0) {
            toast.error('Please add at least one achievement');
            return;
        }

        // Helper to format items for API
        const formatItems = (items) => items.filter(item => item.text.trim()).map(item => ({
            text: item.text,
            linked_item: item.linked_item,
            completion_date: item.linked_item?.due_date || null,
        }));

        setSubmitting(true);
        try {
            await api.post('/pulse/updates/weekly', {
                achievement_items: formatItems(weeklyForm.achievement_items),
                issues_faced_items: formatItems(weeklyForm.issues_faced_items),
                next_week_focus_items: formatItems(weeklyForm.next_week_focus_items),
                team_highlights_items: formatItems(weeklyForm.team_highlights_items),
                notes: weeklyForm.notes || null,
            });
            toast.success('Weekly update submitted!');
            setShowWeeklyDialog(false);
            setWeeklyForm({
                achievement_items: [{ text: '', linked_item: null }],
                issues_faced_items: [{ text: '', linked_item: null }],
                next_week_focus_items: [{ text: '', linked_item: null }],
                team_highlights_items: [{ text: '', linked_item: null }],
                notes: '',
            });
            fetchUpdates();
        } catch (error) {
            toast.error('Failed to submit weekly update');
        } finally {
            setSubmitting(false);
        }
    };

    // Handlers for linked items - support ALL fields
    const addLinkedItem = (formType, field) => {
        if (formType === 'daily') {
            setDailyForm({
                ...dailyForm,
                [field]: [...dailyForm[field], { text: '', linked_item: null }]
            });
        } else {
            setWeeklyForm({
                ...weeklyForm,
                [field]: [...weeklyForm[field], { text: '', linked_item: null }]
            });
        }
    };

    const updateLinkedItemText = (formType, field, index, text) => {
        if (formType === 'daily') {
            const updated = [...dailyForm[field]];
            updated[index] = { ...updated[index], text };
            setDailyForm({ ...dailyForm, [field]: updated });
        } else {
            const updated = [...weeklyForm[field]];
            updated[index] = { ...updated[index], text };
            setWeeklyForm({ ...weeklyForm, [field]: updated });
        }
    };

    const setLinkedItem = (formType, field, index, item) => {
        if (formType === 'daily') {
            const updated = [...dailyForm[field]];
            updated[index] = {
                ...updated[index],
                linked_item: item ? {
                    item_type: item.item_type,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    project_id: item.project_id,
                    project_name: item.project_name,
                } : null,
                text: updated[index].text || item?.item_name || ''
            };
            setDailyForm({ ...dailyForm, [field]: updated });
        } else {
            const updated = [...weeklyForm[field]];
            updated[index] = {
                ...updated[index],
                linked_item: item ? {
                    item_type: item.item_type,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    project_id: item.project_id,
                    project_name: item.project_name,
                } : null,
                text: updated[index].text || item?.item_name || ''
            };
            setWeeklyForm({ ...weeklyForm, [field]: updated });
        }
    };

    const removeLinkedItem = (formType, field, index) => {
        if (formType === 'daily') {
            const updated = dailyForm[field].filter((_, i) => i !== index);
            setDailyForm({
                ...dailyForm,
                [field]: updated.length ? updated : [{ text: '', linked_item: null }]
            });
        } else {
            const updated = weeklyForm[field].filter((_, i) => i !== index);
            setWeeklyForm({
                ...weeklyForm,
                [field]: updated.length ? updated : [{ text: '', linked_item: null }]
            });
        }
    };

    const clearLinkedItem = (formType, field, index) => {
        if (formType === 'daily') {
            const updated = [...dailyForm[field]];
            updated[index] = { ...updated[index], linked_item: null };
            setDailyForm({ ...dailyForm, [field]: updated });
        } else {
            const updated = [...weeklyForm[field]];
            updated[index] = { ...updated[index], linked_item: null };
            setWeeklyForm({ ...weeklyForm, [field]: updated });
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

    // Helper to get link URL for a linked item
    const getLinkedItemUrl = (linkedItem) => {
        if (!linkedItem) return null;
        if (linkedItem.item_type === 'project') {
            return `/projects/${linkedItem.item_id}`;
        } else if (linkedItem.item_type === 'task') {
            return linkedItem.project_id ? `/projects/${linkedItem.project_id}` : '/projects';
        }
        return null;
    };

    // Linkable Item Input component for ALL fields with optional link to projects/tasks
    const LinkableItemInput = ({ formType, field, items, placeholder, icon: Icon = CheckCircle, iconColor = "text-emerald-500" }) => {
        const [openPopoverIndex, setOpenPopoverIndex] = useState(null);
        const [localSearch, setLocalSearch] = useState('');

        const filteredItems = linkableItems.filter(item => 
            !localSearch || 
            item.item_name?.toLowerCase().includes(localSearch.toLowerCase()) ||
            item.project_name?.toLowerCase().includes(localSearch.toLowerCase())
        );

        return (
            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
                            <Input
                                value={item.text}
                                onChange={(e) => updateLinkedItemText(formType, field, idx, e.target.value)}
                                placeholder={placeholder}
                                className="flex-1"
                                data-testid={`${field}-text-${idx}`}
                            />
                            <Popover modal={true} open={openPopoverIndex === idx} onOpenChange={(open) => setOpenPopoverIndex(open ? idx : null)}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={item.linked_item ? "default" : "outline"}
                                        size="sm"
                                        className={item.linked_item ? "bg-blue-600 hover:bg-blue-700" : ""}
                                        data-testid={`${field}-link-btn-${idx}`}
                                    >
                                        <Link2 className="w-4 h-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-2 z-[100]" align="end">
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search tasks & projects..."
                                                value={localSearch}
                                                onChange={(e) => {
                                                    setLocalSearch(e.target.value);
                                                    fetchLinkableItems(e.target.value);
                                                }}
                                                className="pl-8"
                                                data-testid="link-search-input"
                                            />
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-1">
                                            {linkableLoading ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                                </div>
                                            ) : filteredItems.length === 0 ? (
                                                <p className="text-sm text-gray-500 text-center py-4">No items found</p>
                                            ) : (
                                                filteredItems.map((linkItem) => (
                                                    <button
                                                        key={`${linkItem.item_type}-${linkItem.item_id}`}
                                                        onClick={() => {
                                                            setLinkedItem(formType, field, idx, linkItem);
                                                            setOpenPopoverIndex(null);
                                                            setLocalSearch('');
                                                        }}
                                                        className="w-full text-left p-2 rounded hover:bg-gray-100 flex items-start gap-2 transition-colors"
                                                        data-testid={`link-option-${linkItem.item_id}`}
                                                    >
                                                        {linkItem.item_type === 'task' ? (
                                                            <ListTodo className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                                        ) : (
                                                            <FolderKanban className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{linkItem.item_name}</p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <span className="capitalize">{linkItem.item_type}</span>
                                                                {linkItem.project_name && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="truncate">{linkItem.project_name}</span>
                                                                    </>
                                                                )}
                                                                {linkItem.status && (
                                                                    <Badge variant="outline" className="text-xs py-0 capitalize">
                                                                        {linkItem.status}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {items.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeLinkedItem(formType, field, idx)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        {/* Show linked item badge */}
                        {item.linked_item && (
                            <div className="ml-6 flex items-center gap-1">
                                <Badge 
                                    variant="secondary" 
                                    className="text-xs flex items-center gap-1 pr-1"
                                    data-testid={`${field}-badge-${idx}`}
                                >
                                    {item.linked_item.item_type === 'task' ? (
                                        <ListTodo className="w-3 h-3" />
                                    ) : (
                                        <FolderKanban className="w-3 h-3" />
                                    )}
                                    <span className="capitalize">{item.linked_item.item_type}:</span>
                                    <span className="font-medium max-w-32 truncate">{item.linked_item.item_name}</span>
                                    <button 
                                        onClick={() => clearLinkedItem(formType, field, idx)}
                                        className="ml-1 hover:bg-gray-300 rounded p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                                {item.linked_item.project_name && (
                                    <span className="text-xs text-gray-500">in {item.linked_item.project_name}</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addLinkedItem(formType, field)}
                    className="w-full"
                    data-testid={`${field}-add-btn`}
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
            </div>
        );
    };

    // Filter employees by search and department
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = !searchQuery || 
            emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
        return matchesSearch && matchesDept;
    });

    // Group updates by employee for team view
    const groupUpdatesByEmployee = (updates) => {
        const grouped = {};
        updates.forEach(update => {
            const key = update.user_id || update.user_name;
            if (!grouped[key]) {
                grouped[key] = {
                    user_id: update.user_id,
                    user_name: update.user_name,
                    department: update.department,
                    updates: []
                };
            }
            grouped[key].updates.push(update);
        });
        return Object.values(grouped);
    };

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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">Work Updates</h1>
                    <p className="text-[#5D4A3A] mt-1">Track daily and weekly progress across teams</p>
                </div>
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

            {/* Filters Section - Enhanced for Managers */}
            <Card className="mb-6 bg-white border-[#E8D5C4]">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Department Filter */}
                        <Select value={filterDepartment} onValueChange={(v) => { setFilterDepartment(v); setFilterEmployee('all'); }}>
                            <SelectTrigger className="w-44 border-[#E8D5C4]">
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {DEPARTMENTS.map(d => (
                                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Team Member Filter - Only for Managers */}
                        {isManager && (
                            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                <SelectTrigger className="w-52 border-[#E8D5C4]">
                                    <User className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Team Member" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Team Members</SelectItem>
                                    {filteredEmployees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{emp.name}</span>
                                                <span className="text-xs text-[#9C8C74] capitalize">({emp.department})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* View Mode Toggle - Only for Managers */}
                        {isManager && (
                            <div className="flex items-center border border-[#E8D5C4] rounded-lg overflow-hidden ml-auto">
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className={`rounded-none ${viewMode === 'list' ? 'bg-rose-600' : 'hover:bg-[#F5EBE0]'}`}
                                >
                                    <List className="w-4 h-4 mr-1" />
                                    List
                                </Button>
                                <Button
                                    variant={viewMode === 'team' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('team')}
                                    className={`rounded-none ${viewMode === 'team' ? 'bg-rose-600' : 'hover:bg-[#F5EBE0]'}`}
                                >
                                    <Users className="w-4 h-4 mr-1" />
                                    By Team
                                </Button>
                            </div>
                        )}

                        <Button variant="outline" onClick={fetchUpdates} className="border-[#E8D5C4] hover:bg-[#F5EBE0]">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="daily" className="space-y-6">
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
                    ) : viewMode === 'team' && isManager ? (
                        /* Team View - Grouped by Employee */
                        <div className="space-y-6">
                            {groupUpdatesByEmployee(dailyUpdates).map(group => (
                                <Card key={group.user_id || group.user_name}>
                                    <CardHeader className="pb-2 bg-gray-50 border-b">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                                    {getInitials(group.user_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-base">{group.user_name}</CardTitle>
                                                <p className="text-sm text-gray-500 capitalize">{group.department}</p>
                                            </div>
                                            <Badge variant="secondary" className="ml-auto">
                                                {group.updates.length} update{group.updates.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        {group.updates.map(update => (
                                            <div key={update.id} className="border-l-2 border-emerald-300 pl-4">
                                                <p className="text-sm font-medium text-gray-600 mb-2">{formatDate(update.date)}</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {(update.completed_items || update.completed_tasks)?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-emerald-700 flex items-center gap-1 mb-1">
                                                                <CheckCircle className="w-3 h-3" /> Completed
                                                            </h5>
                                                            <ul className="text-xs text-gray-600 space-y-0.5">
                                                                {(update.completed_items || update.completed_tasks?.map(t => ({ text: t }))).map((item, i) => (
                                                                    <li key={i} className="flex items-start gap-1">
                                                                        <span>•</span>
                                                                        <span>{typeof item === 'string' ? item : item.text}</span>
                                                                        {item.linked_item && (
                                                                            <span className="text-blue-600 text-[10px]">🔗</span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {update.blockers?.length > 0 && update.blockers[0] && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-red-700 flex items-center gap-1 mb-1">
                                                                <AlertTriangle className="w-3 h-3" /> Blockers
                                                            </h5>
                                                            <ul className="text-xs text-gray-600 space-y-0.5">
                                                                {update.blockers.filter(b => b).map((b, i) => <li key={i}>• {b}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {update.tomorrow_focus?.length > 0 && update.tomorrow_focus[0] && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-blue-700 flex items-center gap-1 mb-1">
                                                                <Target className="w-3 h-3" /> Tomorrow
                                                            </h5>
                                                            <ul className="text-xs text-gray-600 space-y-0.5">
                                                                {update.tomorrow_focus.filter(f => f).map((f, i) => <li key={i}>• {f}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
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
                                                    <ul className="text-sm text-gray-700 space-y-1.5">
                                                        {/* Use completed_items if available, fallback to completed_tasks */}
                                                        {(update.completed_items || update.completed_tasks?.map(t => ({ text: t })))?.map((item, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-emerald-500 mt-0.5">•</span>
                                                                <div className="flex-1">
                                                                    <span>{typeof item === 'string' ? item : item.text}</span>
                                                                    {item.linked_item && getLinkedItemUrl(item.linked_item) && (
                                                                        <Link to={getLinkedItemUrl(item.linked_item)} className="inline-block">
                                                                            <Badge 
                                                                                variant="secondary" 
                                                                                className="ml-2 text-xs py-0 px-1.5 inline-flex items-center gap-1 hover:bg-blue-100 cursor-pointer transition-colors"
                                                                            >
                                                                                {item.linked_item.item_type === 'task' ? (
                                                                                    <ListTodo className="w-3 h-3" />
                                                                                ) : (
                                                                                    <FolderKanban className="w-3 h-3" />
                                                                                )}
                                                                                <span className="max-w-24 truncate">{item.linked_item.item_name}</span>
                                                                                <ExternalLink className="w-3 h-3 text-blue-500" />
                                                                            </Badge>
                                                                        </Link>
                                                                    )}
                                                                    {item.linked_item && !getLinkedItemUrl(item.linked_item) && (
                                                                        <Badge 
                                                                            variant="secondary" 
                                                                            className="ml-2 text-xs py-0 px-1.5 inline-flex items-center gap-1"
                                                                        >
                                                                            {item.linked_item.item_type === 'task' ? (
                                                                                <ListTodo className="w-3 h-3" />
                                                                            ) : (
                                                                                <FolderKanban className="w-3 h-3" />
                                                                            )}
                                                                            <span className="max-w-24 truncate">{item.linked_item.item_name}</span>
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </li>
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
                    ) : viewMode === 'team' && isManager ? (
                        /* Team View - Grouped by Employee */
                        <div className="space-y-6">
                            {groupUpdatesByEmployee(weeklyUpdates).map(group => (
                                <Card key={group.user_id || group.user_name}>
                                    <CardHeader className="pb-2 bg-gray-50 border-b">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarFallback className="bg-violet-100 text-violet-700">
                                                    {getInitials(group.user_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-base">{group.user_name}</CardTitle>
                                                <p className="text-sm text-gray-500 capitalize">{group.department}</p>
                                            </div>
                                            <Badge variant="secondary" className="ml-auto">
                                                {group.updates.length} update{group.updates.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        {group.updates.map(update => (
                                            <div key={update.id} className="border-l-2 border-violet-300 pl-4">
                                                <p className="text-sm font-medium text-gray-600 mb-2">Week of {update.week_start}</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {(update.achievement_items || update.achievements)?.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-violet-700 flex items-center gap-1 mb-1">
                                                                <CheckCircle className="w-3 h-3" /> Achievements
                                                            </h5>
                                                            <ul className="text-xs text-gray-600 space-y-0.5">
                                                                {(update.achievement_items || update.achievements?.map(a => ({ text: a }))).map((item, i) => (
                                                                    <li key={i} className="flex items-start gap-1">
                                                                        <span>•</span>
                                                                        <span>{typeof item === 'string' ? item : item.text}</span>
                                                                        {item.linked_item && (
                                                                            <span className="text-blue-600 text-[10px]">🔗</span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {update.team_highlights?.length > 0 && update.team_highlights[0] && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-blue-700 flex items-center gap-1 mb-1">
                                                                <Users className="w-3 h-3" /> Team Highlights
                                                            </h5>
                                                            <ul className="text-xs text-gray-600 space-y-0.5">
                                                                {update.team_highlights.filter(h => h).map((h, i) => <li key={i}>• {h}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {update.issues_faced?.length > 0 && update.issues_faced[0] && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-red-700 flex items-center gap-1 mb-1">
                                                                <AlertTriangle className="w-3 h-3" /> Challenges
                                                            </h5>
                                                            <ul className="text-xs text-gray-600 space-y-0.5">
                                                                {update.issues_faced.filter(i => i).map((i, idx) => <li key={idx}>• {i}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {update.next_week_focus?.length > 0 && update.next_week_focus[0] && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-emerald-700 flex items-center gap-1 mb-1">
                                                                <Target className="w-3 h-3" /> Next Week
                                                            </h5>
                                                            <ul className="text-xs text-gray-600 space-y-0.5">
                                                                {update.next_week_focus.filter(f => f).map((f, i) => <li key={i}>• {f}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
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
                                                        <ul className="text-sm text-gray-700 space-y-1.5">
                                                            {(update.achievement_items || update.achievements?.map(a => ({ text: a })))?.map((item, i) => (
                                                                <li key={i} className="flex items-start gap-2">
                                                                    <span className="text-violet-500 mt-0.5">•</span>
                                                                    <div className="flex-1">
                                                                        <span>{typeof item === 'string' ? item : item.text}</span>
                                                                        {item.linked_item && getLinkedItemUrl(item.linked_item) && (
                                                                            <Link to={getLinkedItemUrl(item.linked_item)} className="inline-block">
                                                                                <Badge 
                                                                                    variant="secondary" 
                                                                                    className="ml-2 text-xs py-0 px-1.5 inline-flex items-center gap-1 hover:bg-blue-100 cursor-pointer transition-colors"
                                                                                >
                                                                                    {item.linked_item.item_type === 'task' ? (
                                                                                        <ListTodo className="w-3 h-3" />
                                                                                    ) : (
                                                                                        <FolderKanban className="w-3 h-3" />
                                                                                    )}
                                                                                    <span className="max-w-24 truncate">{item.linked_item.item_name}</span>
                                                                                    <ExternalLink className="w-3 h-3 text-blue-500" />
                                                                                </Badge>
                                                                            </Link>
                                                                        )}
                                                                        {item.linked_item && !getLinkedItemUrl(item.linked_item) && (
                                                                            <Badge 
                                                                                variant="secondary" 
                                                                                className="ml-2 text-xs py-0 px-1.5 inline-flex items-center gap-1"
                                                                            >
                                                                                {item.linked_item.item_type === 'task' ? (
                                                                                    <ListTodo className="w-3 h-3" />
                                                                                ) : (
                                                                                    <FolderKanban className="w-3 h-3" />
                                                                                )}
                                                                                <span className="max-w-24 truncate">{item.linked_item.item_name}</span>
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </li>
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-emerald-700">
                                    What did you complete today? *
                                </label>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Link to Task/Project
                                </span>
                            </div>
                            <LinkableItemInput
                                formType="daily"
                                field="completed_items"
                                items={dailyForm.completed_items}
                                placeholder="Completed task..."
                                icon={CheckCircle}
                                iconColor="text-emerald-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-red-700">
                                    Any blockers?
                                </label>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Link
                                </span>
                            </div>
                            <LinkableItemInput
                                formType="daily"
                                field="blocker_items"
                                items={dailyForm.blocker_items}
                                placeholder="Blocker or challenge..."
                                icon={AlertTriangle}
                                iconColor="text-red-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-blue-700">
                                    Tomorrow's focus
                                </label>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Link
                                </span>
                            </div>
                            <LinkableItemInput
                                formType="daily"
                                field="tomorrow_focus_items"
                                items={dailyForm.tomorrow_focus_items}
                                placeholder="Priority for tomorrow..."
                                icon={Target}
                                iconColor="text-blue-500"
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-violet-700">
                                    Key achievements this week *
                                </label>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Link
                                </span>
                            </div>
                            <LinkableItemInput
                                formType="weekly"
                                field="achievement_items"
                                items={weeklyForm.achievement_items}
                                placeholder="Achievement..."
                                icon={CheckCircle}
                                iconColor="text-violet-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-blue-700">
                                    Team highlights
                                </label>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Link
                                </span>
                            </div>
                            <LinkableItemInput
                                formType="weekly"
                                field="team_highlights_items"
                                items={weeklyForm.team_highlights_items}
                                placeholder="Team highlight..."
                                icon={Users}
                                iconColor="text-blue-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-red-700">
                                    Challenges faced
                                </label>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Link
                                </span>
                            </div>
                            <LinkableItemInput
                                formType="weekly"
                                field="issues_faced_items"
                                items={weeklyForm.issues_faced_items}
                                placeholder="Challenge or issue..."
                                icon={AlertTriangle}
                                iconColor="text-red-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-emerald-700">
                                    Next week focus
                                </label>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Link
                                </span>
                            </div>
                            <LinkableItemInput
                                formType="weekly"
                                field="next_week_focus_items"
                                items={weeklyForm.next_week_focus_items}
                                placeholder="Priority for next week..."
                                icon={Target}
                                iconColor="text-emerald-500"
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
