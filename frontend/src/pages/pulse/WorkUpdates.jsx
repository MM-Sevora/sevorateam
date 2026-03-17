import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Checkbox } from '../../components/ui/checkbox';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
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
    List,
    Link2,
    FolderKanban,
    ListTodo,
    ExternalLink,
    ChevronDown,
    CalendarDays,
    CalendarCheck,
    Sparkles,
    Clock,
    Trash2,
    MoreHorizontal,
    Pencil,
    CheckCheck,
    Globe,
} from 'lucide-react';

// ItemInput component - moved OUTSIDE WorkUpdates to prevent re-creation on every render
const ItemInput = memo(function ItemInput({ 
    field, 
    items, 
    placeholder, 
    icon: Icon, 
    iconColor,
    linkableItems,
    linkableLoading,
    onTextChange,
    onLinkSelect,
    onClearLink,
    onRemove,
    onAdd,
    onSearchLinkable
}) {
    const [openPopover, setOpenPopover] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = linkableItems.filter(item => 
        !searchQuery || 
        item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLinkSelect = (idx, linkItem) => {
        onLinkSelect(field, idx, linkItem);
        setOpenPopover(null);
        setSearchQuery('');
    };

    return (
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={`${field}-item-${idx}`} className="group">
                    <div className="flex items-start gap-2 p-2 rounded-lg border border-[#E8D5C4] bg-white hover:border-[#D4BBA6] transition-all">
                        <Icon className={`w-4 h-4 mt-2.5 ${iconColor} flex-shrink-0`} />
                        <div className="flex-1 space-y-1 min-w-0">
                            <input
                                type="text"
                                value={item.text || ''}
                                onChange={(e) => onTextChange(field, idx, e.target.value)}
                                placeholder={placeholder}
                                className="w-full h-8 bg-transparent outline-none text-[#4A3728] placeholder:text-[#A89888]"
                                data-testid={`${field}-input-${idx}`}
                            />
                            {/* Linked item badge */}
                            {item.linked_item && (
                                <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="text-xs gap-1 pr-1 bg-blue-50 text-blue-700 border border-blue-200">
                                        {item.linked_item.item_type === 'task' ? (
                                            <ListTodo className="w-3 h-3" />
                                        ) : (
                                            <FolderKanban className="w-3 h-3" />
                                        )}
                                        <span className="max-w-[150px] truncate">{item.linked_item.item_name}</span>
                                        <button 
                                            onClick={() => onClearLink(field, idx)}
                                            className="hover:bg-blue-100 rounded p-0.5 ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                    {item.linked_item.project_name && (
                                        <span className="text-xs text-[#8B7355]">in {item.linked_item.project_name}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Link button */}
                        <Popover open={openPopover === idx} onOpenChange={(open) => setOpenPopover(open ? idx : null)}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-9 px-2 gap-1 text-xs ${
                                        item.linked_item 
                                            ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100" 
                                            : "border-[#D4BBA6] text-[#6B5D52] hover:bg-[#F5EBE0]"
                                    }`}
                                    title="Link to task or project"
                                    data-testid={`${field}-link-btn-${idx}`}
                                >
                                    <Link2 className="w-3.5 h-3.5" />
                                    {item.linked_item ? 'Linked' : 'Link'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2 z-[100]" align="end" side="bottom" sideOffset={4}>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#8B7355]" />
                                        <Input
                                            placeholder="Search tasks & projects..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                onSearchLinkable(e.target.value);
                                            }}
                                            className="pl-8 border-[#E8D5C4]"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {linkableLoading ? (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="w-5 h-5 animate-spin text-[#8B7355]" />
                                            </div>
                                        ) : filteredItems.length === 0 ? (
                                            <p className="text-sm text-[#8B7355] text-center py-4">No items found</p>
                                        ) : (
                                            filteredItems.map((linkItem) => (
                                                <button
                                                    key={`${linkItem.item_type}-${linkItem.item_id}`}
                                                    onClick={() => handleLinkSelect(idx, linkItem)}
                                                    className="w-full text-left p-2 rounded hover:bg-[#F5EBE0] flex items-start gap-2"
                                                >
                                                    {linkItem.item_type === 'task' ? (
                                                        <ListTodo className="w-4 h-4 text-blue-500 mt-0.5" />
                                                    ) : (
                                                        <FolderKanban className="w-4 h-4 text-violet-500 mt-0.5" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate text-[#4A3728]">{linkItem.item_name}</p>
                                                        <p className="text-xs text-[#8B7355] truncate">
                                                            {linkItem.project_name || linkItem.item_type}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        {/* Remove button */}
                        {items.length > 1 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(field, idx)}
                                className="h-9 w-9 p-0 text-[#8B7355] hover:text-red-600 hover:bg-red-50"
                                data-testid={`${field}-remove-btn-${idx}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
            <Button
                variant="outline"
                size="sm"
                onClick={() => onAdd(field)}
                className="w-full text-[#6B5D52] border-dashed border-[#D4BBA6] hover:bg-[#F5EBE0]"
                data-testid={`${field}-add-btn`}
            >
                <Plus className="w-4 h-4 mr-1" /> Add item
            </Button>
        </div>
    );
});

// Update type configurations
const UPDATE_TYPES = {
    daily: { 
        label: 'Daily Update', 
        icon: Calendar, 
        color: 'bg-emerald-600 hover:bg-emerald-700',
        description: "What you accomplished today"
    },
    weekly: { 
        label: 'Weekly Update', 
        icon: CalendarRange, 
        color: 'bg-violet-600 hover:bg-violet-700',
        description: "Your week in review"
    },
    monthly: { 
        label: 'Monthly Update', 
        icon: CalendarDays, 
        color: 'bg-blue-600 hover:bg-blue-700',
        description: "Monthly highlights & goals"
    },
    quarterly: { 
        label: 'Quarterly Update', 
        icon: CalendarCheck, 
        color: 'bg-amber-600 hover:bg-amber-700',
        description: "Quarter review & OKRs"
    },
};

export default function WorkUpdates() {
    const { api, user } = useAuth();
    const [dailyUpdates, setDailyUpdates] = useState([]);
    const [weeklyUpdates, setWeeklyUpdates] = useState([]);
    const [monthlyUpdates, setMonthlyUpdates] = useState([]);
    const [quarterlyUpdates, setQuarterlyUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [updateType, setUpdateType] = useState('daily');
    const [submitting, setSubmitting] = useState(false);
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterEmployee, setFilterEmployee] = useState('all');
    const [employees, setEmployees] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [activeTab, setActiveTab] = useState('daily');
    
    // Linkable items
    const [linkableItems, setLinkableItems] = useState([]);
    const [linkableLoading, setLinkableLoading] = useState(false);

    // Form state - unified for all update types
    const [formData, setFormData] = useState({
        completed: [{ text: '', linked_item: null }],
        blockers: [{ text: '', linked_item: null }],
        next_focus: [{ text: '', linked_item: null }],
        highlights: [{ text: '', linked_item: null }],
        notes: '',
        sharePublicly: false,
    });
    
    // Edit mode state
    const [editingUpdate, setEditingUpdate] = useState(null);
    const [editType, setEditType] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const DEPARTMENTS = ['marketing', 'buying', 'warehouse', 'technology', 'operations', 'finance', 'hr', 'sales', 'leadership'];
    const isManager = ['super_admin', 'admin', 'department_manager', 'team_lead'].includes(user?.role);

    // Fetch linkable items
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
        if (isManager) fetchEmployees();
    }, [filterDepartment, filterEmployee]);

    useEffect(() => {
        if (showUpdateDialog) fetchLinkableItems();
    }, [showUpdateDialog, fetchLinkableItems]);

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
            let params = [];
            if (filterDepartment && filterDepartment !== 'all') params.push(`department=${filterDepartment}`);
            if (filterEmployee && filterEmployee !== 'all') params.push(`user_id=${filterEmployee}`);
            const query = params.length > 0 ? `?${params.join('&')}` : '';
            
            const [dailyRes, weeklyRes, monthlyRes, quarterlyRes] = await Promise.all([
                api.get(`/pulse/updates/daily${query}`),
                api.get(`/pulse/updates/weekly${query}`),
                api.get(`/pulse/updates/monthly${query}`),
                api.get(`/pulse/updates/quarterly${query}`),
            ]);
            setDailyUpdates(dailyRes.data.updates || []);
            setWeeklyUpdates(weeklyRes.data.updates || []);
            setMonthlyUpdates(monthlyRes.data.updates || []);
            setQuarterlyUpdates(quarterlyRes.data.updates || []);
        } catch (error) {
            console.error('Failed to fetch updates:', error);
            toast.error('Failed to load updates');
        } finally {
            setLoading(false);
        }
    };

    const openUpdateDialog = (type) => {
        setUpdateType(type);
        setEditingUpdate(null);
        setEditType(null);
        setFormData({
            completed: [{ text: '', linked_item: null }],
            blockers: [{ text: '', linked_item: null }],
            next_focus: [{ text: '', linked_item: null }],
            highlights: [{ text: '', linked_item: null }],
            notes: '',
            sharePublicly: false,
        });
        setShowUpdateDialog(true);
    };
    
    // Open edit dialog with existing data
    const openEditDialog = (update, type) => {
        setUpdateType(type);
        setEditingUpdate(update);
        setEditType(type);
        
        // Map update data to form format based on type
        const mapItemsToForm = (items) => {
            if (!items || items.length === 0) return [{ text: '', linked_item: null }];
            return items.map(item => ({
                text: typeof item === 'string' ? item : item.text || '',
                linked_item: typeof item === 'object' ? item.linked_item : null
            }));
        };
        
        let completed = [], blockers = [], nextFocus = [], highlights = [];
        
        if (type === 'daily') {
            completed = mapItemsToForm(update.completed_items || update.completed_tasks);
            blockers = mapItemsToForm(update.blocker_items || update.blockers);
            nextFocus = mapItemsToForm(update.tomorrow_focus_items || update.tomorrow_focus);
        } else if (type === 'weekly') {
            completed = mapItemsToForm(update.achievement_items || update.achievements);
            blockers = mapItemsToForm(update.issues_faced_items || update.issues_faced);
            nextFocus = mapItemsToForm(update.next_week_focus_items || update.next_week_focus);
            highlights = mapItemsToForm(update.team_highlights_items || update.team_highlights);
        } else if (type === 'monthly') {
            completed = mapItemsToForm(update.accomplishment_items || update.accomplishments);
            blockers = mapItemsToForm(update.challenge_items || update.challenges);
            nextFocus = mapItemsToForm(update.next_month_focus_items || update.next_month_focus);
            highlights = mapItemsToForm(update.goals_progress_items || update.goals_progress);
        } else if (type === 'quarterly') {
            completed = mapItemsToForm(update.achievement_items || update.achievements);
            blockers = mapItemsToForm(update.challenge_items || update.challenges);
            nextFocus = mapItemsToForm(update.next_quarter_focus_items || update.next_quarter_focus);
            highlights = mapItemsToForm(update.okr_progress_items || update.okr_progress);
        }
        
        setFormData({
            completed: completed.length ? completed : [{ text: '', linked_item: null }],
            blockers: blockers.length ? blockers : [{ text: '', linked_item: null }],
            next_focus: nextFocus.length ? nextFocus : [{ text: '', linked_item: null }],
            highlights: highlights.length ? highlights : [{ text: '', linked_item: null }],
            notes: update.notes || '',
            sharePublicly: update.share_publicly || false,
        });
        setShowUpdateDialog(true);
    };

    const handleSubmit = async () => {
        // Valid items have either text OR a linked item
        const validItems = formData.completed.filter(item => item.text.trim() || item.linked_item);
        if (validItems.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        // Format items - include if has text OR has linked item
        const formatItems = (items) => items.filter(item => item.text.trim() || item.linked_item).map(item => ({
            text: item.text || (item.linked_item ? item.linked_item.item_name : ''),
            linked_item: item.linked_item,
        }));

        setSubmitting(true);
        try {
            const isEdit = !!editingUpdate;
            const method = isEdit ? 'put' : 'post';
            const baseUrl = isEdit ? `/pulse/updates/${updateType}/${editingUpdate.id}` : `/pulse/updates/${updateType}`;
            
            if (updateType === 'daily') {
                await api[method](baseUrl, {
                    completed_items: formatItems(formData.completed),
                    blocker_items: formatItems(formData.blockers),
                    tomorrow_focus_items: formatItems(formData.next_focus),
                    notes: formData.notes || null,
                    share_publicly: formData.sharePublicly,
                });
            } else if (updateType === 'weekly') {
                await api[method](baseUrl, {
                    achievement_items: formatItems(formData.completed),
                    issues_faced_items: formatItems(formData.blockers),
                    next_week_focus_items: formatItems(formData.next_focus),
                    team_highlights_items: formatItems(formData.highlights),
                    notes: formData.notes || null,
                });
            } else if (updateType === 'monthly') {
                await api[method](baseUrl, {
                    accomplishment_items: formatItems(formData.completed),
                    goals_progress_items: formatItems(formData.highlights),
                    challenge_items: formatItems(formData.blockers),
                    next_month_focus_items: formatItems(formData.next_focus),
                    notes: formData.notes || null,
                });
            } else if (updateType === 'quarterly') {
                await api[method](baseUrl, {
                    achievement_items: formatItems(formData.completed),
                    okr_progress_items: formatItems(formData.highlights),
                    challenge_items: formatItems(formData.blockers),
                    next_quarter_focus_items: formatItems(formData.next_focus),
                    notes: formData.notes || null,
                });
            }
            toast.success(isEdit ? `${UPDATE_TYPES[updateType].label} updated!` : `${UPDATE_TYPES[updateType].label} submitted!`);
            setShowUpdateDialog(false);
            setEditingUpdate(null);
            fetchUpdates();
        } catch (error) {
            toast.error(editingUpdate ? 'Failed to update' : 'Failed to submit update');
        } finally {
            setSubmitting(false);
        }
    };
    
    // Delete update
    const handleDeleteUpdate = async (updateId, type) => {
        if (!confirm('Are you sure you want to delete this update?')) return;
        
        setDeleting(true);
        try {
            await api.delete(`/pulse/updates/${type}/${updateId}`);
            toast.success('Update deleted');
            fetchUpdates();
        } catch (error) {
            toast.error('Failed to delete update');
        } finally {
            setDeleting(false);
        }
    };
    
    // Acknowledge update (for managers)
    const handleAcknowledge = async (updateId) => {
        try {
            const response = await api.post(`/pulse/updates/daily/${updateId}/acknowledge`);
            if (response.data.success) {
                toast.success('Update acknowledged');
                fetchUpdates();
            } else {
                toast.info(response.data.message);
            }
        } catch (error) {
            toast.error('Failed to acknowledge');
        }
    };

    // Create task from blocker
    const handleCreateTask = async (updateId, blockerIndex, blockerText) => {
        try {
            const response = await api.post(`/pulse/updates/daily/${updateId}/create-task?blocker_index=${blockerIndex}`, {
                priority: 'high'
            });
            if (response.data.success) {
                toast.success('Task created!');
                fetchUpdates();
            } else {
                toast.info(response.data.message);
            }
        } catch (error) {
            toast.error('Failed to create task');
        }
    };

    // Form item handlers - wrapped in useCallback to prevent unnecessary re-renders
    const addItem = useCallback((field) => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], { text: '', linked_item: null }]
        }));
    }, []);

    const updateItemText = useCallback((field, index, text) => {
        setFormData(prev => {
            const updated = [...prev[field]];
            updated[index] = { ...updated[index], text };
            return { ...prev, [field]: updated };
        });
    }, []);

    const setItemLink = useCallback((field, index, item) => {
        setFormData(prev => {
            const updated = [...prev[field]];
            updated[index] = {
                ...updated[index],
                linked_item: item ? {
                    item_type: item.item_type,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    project_id: item.project_id,
                    project_name: item.project_name,
                } : null,
            };
            return { ...prev, [field]: updated };
        });
    }, []);

    const removeItem = useCallback((field, index) => {
        setFormData(prev => {
            const updated = prev[field].filter((_, i) => i !== index);
            return {
                ...prev,
                [field]: updated.length ? updated : [{ text: '', linked_item: null }]
            };
        });
    }, []);

    const clearItemLink = useCallback((field, index) => {
        setFormData(prev => {
            const updated = [...prev[field]];
            updated[index] = { ...updated[index], linked_item: null };
            return { ...prev, [field]: updated };
        });
    }, []);

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

    // Update Card Component
    const UpdateCard = ({ update, type }) => {
        // Get items based on update type
        const getCompletedItems = () => {
            if (type === 'daily') return update.completed_items || update.completed || [];
            if (type === 'weekly') return update.achievement_items || update.achievements || [];
            if (type === 'monthly') return update.accomplishment_items || update.accomplishments || [];
            if (type === 'quarterly') return update.achievement_items || update.achievements || [];
            return [];
        };
        
        const getBlockerItems = () => {
            if (type === 'daily') return update.blocker_items || update.blockers || [];
            if (type === 'weekly') return update.issues_faced_items || update.issues_faced || [];
            if (type === 'monthly') return update.challenge_items || update.challenges || [];
            if (type === 'quarterly') return update.challenge_items || update.challenges || [];
            return [];
        };
        
        const getFocusItems = () => {
            if (type === 'daily') return update.tomorrow_focus_items || update.tomorrow_focus || [];
            if (type === 'weekly') return update.next_week_focus_items || update.next_week_focus || [];
            if (type === 'monthly') return update.next_month_focus_items || update.next_month_focus || [];
            if (type === 'quarterly') return update.next_quarter_focus_items || update.next_quarter_focus || [];
            return [];
        };
        
        const getHighlightItems = () => {
            if (type === 'weekly') return update.team_highlights_items || update.team_highlights || [];
            if (type === 'monthly') return update.goals_progress_items || update.goals_progress || [];
            if (type === 'quarterly') return update.okr_progress_items || update.okr_progress || [];
            return [];
        };
        
        const completedItems = getCompletedItems();
        const blockerItems = getBlockerItems();
        const focusItems = getFocusItems();
        const highlightItems = getHighlightItems();
        
        const getCompletedLabel = () => {
            if (type === 'daily') return 'Completed';
            if (type === 'weekly') return 'Achievements';
            if (type === 'monthly') return 'Accomplishments';
            if (type === 'quarterly') return 'Quarter Achievements';
            return 'Completed';
        };
        
        const getBlockerLabel = () => {
            if (type === 'daily') return 'Blockers';
            return 'Challenges';
        };
        
        const getFocusLabel = () => {
            if (type === 'daily') return "Tomorrow's Focus";
            if (type === 'weekly') return 'Next Week Focus';
            if (type === 'monthly') return 'Next Month Focus';
            if (type === 'quarterly') return 'Next Quarter Focus';
            return 'Focus';
        };
        
        const getHighlightLabel = () => {
            if (type === 'weekly') return 'Team Highlights';
            if (type === 'monthly') return 'Goals Progress';
            if (type === 'quarterly') return 'OKR Progress';
            return 'Highlights';
        };
        
        const getPeriodLabel = () => {
            if (type === 'monthly' && update.month) return update.month;
            if (type === 'quarterly' && update.quarter) return update.quarter;
            return null;
        };

        const renderItems = (items, section) => {
            if (!items || items.length === 0) return null;
            return items.map((item, idx) => {
                const text = typeof item === 'string' ? item : item.text;
                const linkedItem = typeof item === 'object' ? item.linked_item : null;
                const linkedTaskId = typeof item === 'object' ? item.linked_task_id : null;
                
                // Determine the correct navigation path for linked items
                const getLinkedItemPath = () => {
                    if (!linkedItem) return '/projects';
                    if (linkedItem.item_type === 'project') {
                        // For projects, use item_id as the project ID
                        return `/projects/${linkedItem.item_id}`;
                    }
                    if (linkedItem.item_type === 'task') {
                        // For tasks, navigate to the project (if has one) or My Tasks
                        return linkedItem.project_id 
                            ? `/projects/${linkedItem.project_id}?task=${linkedItem.item_id}`
                            : `/projects/my-tasks?task=${linkedItem.item_id}`;
                    }
                    return '/projects';
                };
                
                return (
                    <div key={idx} className="flex items-start gap-2 py-1">
                        <span className="text-[#6B5D52]">•</span>
                        <div className="flex-1">
                            <span className="text-[#4A3728]">{text}</span>
                            {linkedItem && (
                                <Link 
                                    to={getLinkedItemPath()}
                                    className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
                                    data-testid={`linked-item-${section}-${idx}`}
                                >
                                    {linkedItem.item_type === 'task' ? <ListTodo className="w-3 h-3" /> : <FolderKanban className="w-3 h-3" />}
                                    <span className="max-w-[100px] truncate">{linkedItem.item_name}</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            )}
                        </div>
                        {/* Create task button for blockers */}
                        {section === 'blockers' && type === 'daily' && !linkedTaskId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateTask(update.id, idx, text)}
                                className="h-6 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                data-testid={`create-task-btn-${idx}`}
                            >
                                + Task
                            </Button>
                        )}
                        {linkedTaskId && (
                            <Link
                                to={`/projects/my-tasks?task=${linkedTaskId}`}
                                className="inline-flex items-center text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100"
                                data-testid={`view-created-task-${idx}`}
                            >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Task Created
                                <ExternalLink className="w-3 h-3 ml-1" />
                            </Link>
                        )}
                    </div>
                );
            });
        };

        const isOwnUpdate = update.user_id === user?.id;
        const acknowledgedBy = update.acknowledged_by || [];
        const isAcknowledged = acknowledgedBy.length > 0;
        const hasUserAcknowledged = acknowledgedBy.some(ack => ack.user_id === user?.id);

        return (
            <Card className="border-[#E8D5C4] hover:border-[#D4BBA6] transition-colors">
                <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-[#E8D5C4] text-[#4A3728]">
                                {getInitials(update.user_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-[#4A3728]">{update.user_name}</span>
                                <Badge variant="outline" className="text-xs border-[#D4BBA6] text-[#6B5D52]">
                                    {update.department || 'Team'}
                                </Badge>
                                {getPeriodLabel() && (
                                    <Badge className="text-xs bg-blue-100 text-blue-700">
                                        {getPeriodLabel()}
                                    </Badge>
                                )}
                                {update.share_publicly && type === 'daily' && (
                                    <Badge className="text-xs bg-green-100 text-green-700 gap-1">
                                        <Globe className="w-3 h-3" />
                                        Public
                                    </Badge>
                                )}
                                {isAcknowledged && (
                                    <Badge className="text-xs bg-teal-100 text-teal-700 gap-1">
                                        <CheckCheck className="w-3 h-3" />
                                        Acknowledged
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-[#8B7355]">{formatDate(update.date || update.created_at)}</span>
                        </div>
                        
                        {/* Action Menu & Acknowledge */}
                        <div className="flex items-center gap-2">
                            {/* Acknowledge button for managers (only for daily, not own update) */}
                            {isManager && type === 'daily' && !isOwnUpdate && !hasUserAcknowledged && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAcknowledge(update.id)}
                                    className="h-8 text-xs border-teal-200 text-teal-600 hover:bg-teal-50"
                                    data-testid={`acknowledge-btn-${update.id}`}
                                >
                                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                                    Acknowledge
                                </Button>
                            )}
                            
                            {/* Action menu for own updates */}
                            {isOwnUpdate && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-[#8B7355] hover:text-[#4A3728]"
                                            data-testid={`update-menu-${update.id}`}
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 bg-white">
                                        <DropdownMenuItem
                                            onClick={() => openEditDialog(update, type)}
                                            className="cursor-pointer"
                                        >
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleDeleteUpdate(update.id, type)}
                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                    
                    {/* Acknowledgment details */}
                    {isAcknowledged && (
                        <div className="mb-3 p-2 bg-teal-50 rounded-lg border border-teal-100">
                            <div className="flex items-center gap-2 text-xs text-teal-700">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Acknowledged by: {acknowledgedBy.map(a => a.user_name).join(', ')}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Content */}
                    <div className="space-y-3">
                        {completedItems.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium mb-1">
                                    <CheckCircle className="w-4 h-4" />
                                    {getCompletedLabel()}
                                </div>
                                <div className="ml-6 space-y-0.5">
                                    {renderItems(completedItems, 'completed')}
                                </div>
                            </div>
                        )}
                        
                        {highlightItems.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-amber-600 text-sm font-medium mb-1">
                                    <Sparkles className="w-4 h-4" />
                                    {getHighlightLabel()}
                                </div>
                                <div className="ml-6 space-y-0.5">
                                    {renderItems(highlightItems, 'highlights')}
                                </div>
                            </div>
                        )}
                        
                        {blockerItems.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    {getBlockerLabel()}
                                </div>
                                <div className="ml-6 space-y-0.5">
                                    {renderItems(blockerItems, 'blockers')}
                                </div>
                            </div>
                        )}
                        
                        {focusItems.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-1">
                                    <Target className="w-4 h-4" />
                                    {getFocusLabel()}
                                </div>
                                <div className="ml-6 space-y-0.5">
                                    {renderItems(focusItems, 'focus')}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto" data-testid="work-updates-page">
            {/* Clean Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">Work Updates</h1>
                    <p className="text-[#8B7355] text-sm mt-1">Track progress across your team</p>
                </div>
                
                {/* Single Submit Button with Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                            <Plus className="w-4 h-4" />
                            Submit Update
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-white border-[#E8D5C4]">
                        {Object.entries(UPDATE_TYPES).map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                                <DropdownMenuItem 
                                    key={key}
                                    onClick={() => openUpdateDialog(key)}
                                    className="cursor-pointer py-3"
                                >
                                    <Icon className="w-4 h-4 mr-3 text-[#6B5D52]" />
                                    <div>
                                        <p className="font-medium text-[#4A3728]">{config.label}</p>
                                        <p className="text-xs text-[#8B7355]">{config.description}</p>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Filters - Simplified */}
            <div className="flex items-center gap-3 mb-6">
                <Select value={filterDepartment} onValueChange={(v) => { setFilterDepartment(v); setFilterEmployee('all'); }}>
                    <SelectTrigger className="w-[160px] border-[#E8D5C4] bg-white">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {DEPARTMENTS.map(d => (
                            <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {isManager && (
                    <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                        <SelectTrigger className="w-[180px] border-[#E8D5C4] bg-white">
                            <User className="w-4 h-4 mr-2 text-[#8B7355]" />
                            <SelectValue placeholder="Team Member" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            {employees.filter(e => filterDepartment === 'all' || e.department === filterDepartment).map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <div className="flex-1" />

                {isManager && (
                    <div className="flex rounded-lg border border-[#E8D5C4] overflow-hidden bg-white">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-[#4A3728]'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('team')}
                            className={`px-3 py-2 text-sm ${viewMode === 'team' ? 'bg-teal-600 text-white' : 'text-[#4A3728]'}`}
                        >
                            <Users className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <Button variant="ghost" size="sm" onClick={fetchUpdates} className="text-[#6B5D52]">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-[#F5EBE0]">
                    <TabsTrigger value="daily" className="data-[state=active]:bg-white">
                        <Calendar className="w-4 h-4 mr-2" />
                        Daily ({dailyUpdates.length})
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="data-[state=active]:bg-white">
                        <CalendarRange className="w-4 h-4 mr-2" />
                        Weekly ({weeklyUpdates.length})
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="data-[state=active]:bg-white">
                        <CalendarDays className="w-4 h-4 mr-2" />
                        Monthly ({monthlyUpdates.length})
                    </TabsTrigger>
                    <TabsTrigger value="quarterly" className="data-[state=active]:bg-white">
                        <CalendarCheck className="w-4 h-4 mr-2" />
                        Quarterly ({quarterlyUpdates.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="daily" className="space-y-4">
                    {dailyUpdates.length === 0 ? (
                        <Card className="border-[#E8D5C4]">
                            <CardContent className="py-12 text-center">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-[#D4BBA6]" />
                                <h3 className="text-lg font-medium text-[#4A3728]">No daily updates yet</h3>
                                <p className="text-[#8B7355] mt-1">Share what you accomplished today!</p>
                                <Button onClick={() => openUpdateDialog('daily')} className="mt-4 bg-teal-600 hover:bg-teal-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Submit Daily Update
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        dailyUpdates.map(update => (
                            <UpdateCard key={update.id} update={update} type="daily" />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="weekly" className="space-y-4">
                    {weeklyUpdates.length === 0 ? (
                        <Card className="border-[#E8D5C4]">
                            <CardContent className="py-12 text-center">
                                <CalendarRange className="w-12 h-12 mx-auto mb-4 text-[#D4BBA6]" />
                                <h3 className="text-lg font-medium text-[#4A3728]">No weekly updates yet</h3>
                                <p className="text-[#8B7355] mt-1">Share your weekly highlights!</p>
                                <Button onClick={() => openUpdateDialog('weekly')} className="mt-4 bg-teal-600 hover:bg-teal-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Submit Weekly Update
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        weeklyUpdates.map(update => (
                            <UpdateCard key={update.id} update={update} type="weekly" />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="monthly" className="space-y-4">
                    {monthlyUpdates.length === 0 ? (
                        <Card className="border-[#E8D5C4]">
                            <CardContent className="py-12 text-center">
                                <CalendarDays className="w-12 h-12 mx-auto mb-4 text-[#D4BBA6]" />
                                <h3 className="text-lg font-medium text-[#4A3728]">No monthly updates yet</h3>
                                <p className="text-[#8B7355] mt-1">Summarize your monthly accomplishments!</p>
                                <Button onClick={() => openUpdateDialog('monthly')} className="mt-4 bg-teal-600 hover:bg-teal-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Submit Monthly Update
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        monthlyUpdates.map(update => (
                            <UpdateCard key={update.id} update={update} type="monthly" />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="quarterly" className="space-y-4">
                    {quarterlyUpdates.length === 0 ? (
                        <Card className="border-[#E8D5C4]">
                            <CardContent className="py-12 text-center">
                                <CalendarCheck className="w-12 h-12 mx-auto mb-4 text-[#D4BBA6]" />
                                <h3 className="text-lg font-medium text-[#4A3728]">No quarterly updates yet</h3>
                                <p className="text-[#8B7355] mt-1">Share your quarterly achievements and OKR progress!</p>
                                <Button onClick={() => openUpdateDialog('quarterly')} className="mt-4 bg-teal-600 hover:bg-teal-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Submit Quarterly Update
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        quarterlyUpdates.map(update => (
                            <UpdateCard key={update.id} update={update} type="quarterly" />
                        ))
                    )}
                </TabsContent>
            </Tabs>

            {/* Submit Update Dialog - Clean & Simple */}
            <Dialog open={showUpdateDialog} onOpenChange={(open) => {
                setShowUpdateDialog(open);
                if (!open) {
                    setEditingUpdate(null);
                    setEditType(null);
                }
            }}>
                <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
                            {UPDATE_TYPES[updateType] && (
                                <>
                                    {editingUpdate ? <Pencil className="w-5 h-5" /> : React.createElement(UPDATE_TYPES[updateType].icon, { className: "w-5 h-5" })}
                                    {editingUpdate ? `Edit ${UPDATE_TYPES[updateType].label}` : UPDATE_TYPES[updateType].label}
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        {/* Share publicly checkbox (only for daily updates) */}
                        {updateType === 'daily' && (
                            <div className="flex items-center gap-3 p-3 bg-[#F5EBE0] rounded-lg border border-[#E8D5C4]">
                                <Checkbox
                                    id="sharePublicly"
                                    checked={formData.sharePublicly}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sharePublicly: checked }))}
                                />
                                <label htmlFor="sharePublicly" className="flex items-center gap-2 text-sm cursor-pointer">
                                    <Globe className="w-4 h-4 text-[#6B5D52]" />
                                    <span className="text-[#4A3728]">Share with entire organization</span>
                                    <span className="text-xs text-[#8B7355]">(Default: department only)</span>
                                </label>
                            </div>
                        )}
                        
                        {/* Completed / Achievements */}
                        <div>
                            <label className="text-sm font-medium text-[#4A3728] flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                {updateType === 'daily' ? 'What did you complete today?' : 
                                 updateType === 'weekly' ? 'Key achievements this week' :
                                 updateType === 'monthly' ? 'Major accomplishments this month' :
                                 'Quarter achievements'}
                            </label>
                            <ItemInput
                                field="completed"
                                items={formData.completed}
                                placeholder={updateType === 'daily' ? "Completed task or milestone..." : 
                                            updateType === 'weekly' ? "Achievement or win..." :
                                            updateType === 'monthly' ? "Monthly accomplishment..." :
                                            "Quarter achievement..."}
                                icon={CheckCircle}
                                iconColor="text-emerald-500"
                                linkableItems={linkableItems}
                                linkableLoading={linkableLoading}
                                onTextChange={updateItemText}
                                onLinkSelect={setItemLink}
                                onClearLink={clearItemLink}
                                onRemove={removeItem}
                                onAdd={addItem}
                                onSearchLinkable={fetchLinkableItems}
                            />
                        </div>

                        {/* Highlights / Goals / OKR Progress */}
                        {(updateType === 'weekly' || updateType === 'monthly' || updateType === 'quarterly') && (
                            <div>
                                <label className="text-sm font-medium text-[#4A3728] flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    {updateType === 'weekly' ? 'Team highlights' :
                                     updateType === 'monthly' ? 'Goals progress' :
                                     'OKR progress'}
                                    <span className="text-xs text-[#8B7355] font-normal">(optional)</span>
                                </label>
                                <ItemInput
                                    field="highlights"
                                    items={formData.highlights}
                                    placeholder={updateType === 'weekly' ? "Shoutout or team win..." :
                                                updateType === 'monthly' ? "Goal achieved or progressed..." :
                                                "OKR update..."}
                                    icon={Sparkles}
                                    iconColor="text-amber-500"
                                    linkableItems={linkableItems}
                                    linkableLoading={linkableLoading}
                                    onTextChange={updateItemText}
                                    onLinkSelect={setItemLink}
                                    onClearLink={clearItemLink}
                                    onRemove={removeItem}
                                    onAdd={addItem}
                                    onSearchLinkable={fetchLinkableItems}
                                />
                            </div>
                        )}

                        {/* Blockers / Challenges */}
                        <div>
                            <label className="text-sm font-medium text-[#4A3728] flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                {updateType === 'daily' ? 'Any blockers?' : 'Challenges faced'}
                                <span className="text-xs text-[#8B7355] font-normal">(optional)</span>
                            </label>
                            <ItemInput
                                field="blockers"
                                items={formData.blockers}
                                placeholder="Blocker or challenge..."
                                icon={AlertTriangle}
                                iconColor="text-red-500"
                                linkableItems={linkableItems}
                                linkableLoading={linkableLoading}
                                onTextChange={updateItemText}
                                onLinkSelect={setItemLink}
                                onClearLink={clearItemLink}
                                onRemove={removeItem}
                                onAdd={addItem}
                                onSearchLinkable={fetchLinkableItems}
                            />
                        </div>

                        {/* Next Focus */}
                        <div>
                            <label className="text-sm font-medium text-[#4A3728] flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4 text-blue-500" />
                                {updateType === 'daily' ? "Tomorrow's focus" : 
                                 updateType === 'weekly' ? 'Next week priorities' :
                                 updateType === 'monthly' ? 'Next month priorities' :
                                 'Next quarter priorities'}
                                <span className="text-xs text-[#8B7355] font-normal">(optional)</span>
                            </label>
                            <ItemInput
                                field="next_focus"
                                items={formData.next_focus}
                                placeholder="What you'll focus on..."
                                icon={Target}
                                iconColor="text-blue-500"
                                linkableItems={linkableItems}
                                linkableLoading={linkableLoading}
                                onTextChange={updateItemText}
                                onLinkSelect={setItemLink}
                                onClearLink={clearItemLink}
                                onRemove={removeItem}
                                onAdd={addItem}
                                onSearchLinkable={fetchLinkableItems}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium text-[#4A3728] mb-2 block">
                                Additional notes
                                <span className="text-xs text-[#8B7355] font-normal ml-2">(optional)</span>
                            </label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Any other updates or context..."
                                className="border-[#E8D5C4]"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUpdateDialog(false)} className="border-[#D4BBA6]">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={submitting}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : editingUpdate ? <Pencil className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            {editingUpdate ? 'Update' : 'Submit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
