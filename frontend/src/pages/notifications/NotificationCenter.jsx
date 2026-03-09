import React, { useState, useEffect } from 'react';
import { 
    Bell, Check, CheckCheck, MessageSquare, UserPlus, Target, PenTool,
    ClipboardList, Folder, Mail, Share2, AlertTriangle, Clock, Filter,
    Trash2, Settings, ExternalLink, Search, X, ChevronDown, RefreshCw,
    Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const NOTIFICATION_ICONS = {
    task_assigned: ClipboardList,
    task_status_changed: ClipboardList,
    task_due_soon: Clock,
    task_overdue: AlertTriangle,
    task_comment: MessageSquare,
    task_completed: Check,
    project_created: Folder,
    project_status_changed: Folder,
    project_member_added: UserPlus,
    campaign_created: Target,
    campaign_approved: Target,
    influencer_confirmed: UserPlus,
    content_published: PenTool,
    email_received: Mail,
    email_sent: Mail,
    post_scheduled: Share2,
    post_published: Share2,
    engagement_alert: Target,
    user_mentioned: MessageSquare,
    mention: MessageSquare,
    system_alert: AlertTriangle,
    welcome: Bell,
    default: Bell
};

const CATEGORY_CONFIG = {
    task: { label: 'Tasks', icon: ClipboardList, color: 'bg-blue-100 text-blue-700' },
    project: { label: 'Projects', icon: Folder, color: 'bg-purple-100 text-purple-700' },
    marketing: { label: 'Marketing', icon: Target, color: 'bg-orange-100 text-orange-700' },
    mail: { label: 'Mail', icon: Mail, color: 'bg-green-100 text-green-700' },
    social: { label: 'Social', icon: Share2, color: 'bg-pink-100 text-pink-700' },
    mention: { label: 'Mentions', icon: MessageSquare, color: 'bg-amber-100 text-amber-700' },
    approval: { label: 'Approvals', icon: Check, color: 'bg-red-100 text-red-700' },
    system: { label: 'System', icon: AlertTriangle, color: 'bg-gray-100 text-gray-700' },
    reminder: { label: 'Reminders', icon: Clock, color: 'bg-cyan-100 text-cyan-700' }
};

const PRIORITY_STYLES = {
    high: 'border-l-4 border-l-red-500 bg-red-50/30',
    medium: 'border-l-4 border-l-amber-400',
    low: 'border-l-4 border-l-gray-200'
};

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ total_unread: 0, by_category: {} });
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [readFilter, setReadFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [preferences, setPreferences] = useState(null);
    const [savingPrefs, setSavingPrefs] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
        fetchSummary();
        fetchPreferences();
    }, [categoryFilter, priorityFilter, readFilter]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            let url = '/notifications?limit=100';
            if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
            if (priorityFilter !== 'all') url += `&priority=${priorityFilter}`;
            if (readFilter === 'unread') url += `&is_read=false`;
            if (readFilter === 'read') url += `&is_read=true`;
            
            const res = await api.get(url);
            setNotifications(res.data);
        } catch (e) {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await api.get('/notifications/summary');
            setSummary(res.data);
        } catch (e) {
            console.error('Failed to fetch summary:', e);
        }
    };

    const fetchPreferences = async () => {
        try {
            const res = await api.get('/notifications/preferences');
            setPreferences(res.data);
        } catch (e) {
            console.error('Failed to fetch preferences:', e);
        }
    };

    const handleMarkRead = async (notification) => {
        try {
            await api.put(`/notifications/${notification.id}/read`);
            setNotifications(prev => prev.map(n => 
                n.id === notification.id ? { ...n, is_read: true } : n
            ));
            fetchSummary();
        } catch (e) {
            toast.error('Failed to mark as read');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            fetchSummary();
            toast.success('All notifications marked as read');
        } catch (e) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleDelete = async (notification) => {
        try {
            await api.delete(`/notifications/${notification.id}`);
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
            fetchSummary();
            toast.success('Notification deleted');
        } catch (e) {
            toast.error('Failed to delete notification');
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('Delete all read notifications?')) return;
        try {
            await api.delete('/notifications?is_read_only=true');
            setNotifications(prev => prev.filter(n => !n.is_read));
            toast.success('Read notifications deleted');
        } catch (e) {
            toast.error('Failed to delete notifications');
        }
    };

    const handleClick = (notification) => {
        if (!notification.is_read) {
            handleMarkRead(notification);
        }
        if (notification.action_url) {
            navigate(notification.action_url);
        }
    };

    const updatePreference = async (key, value) => {
        setSavingPrefs(true);
        try {
            const res = await api.put('/notifications/preferences', { [key]: value });
            setPreferences(res.data);
            toast.success('Preference updated');
        } catch (e) {
            toast.error('Failed to update preference');
        } finally {
            setSavingPrefs(false);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
        return date.toLocaleDateString();
    };

    const filteredNotifications = notifications.filter(n => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return n.title?.toLowerCase().includes(query) || 
                   n.message?.toLowerCase().includes(query);
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-[#FDF8F3] p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#4A3728]">Notification Center</h1>
                        <p className="text-sm text-[#6B5D52] mt-1">
                            {summary.total_unread} unread notifications
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchNotifications}
                            className="border-[#D4BBA6] text-[#4A3728]"
                        >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllRead}
                            disabled={summary.total_unread === 0}
                            className="border-[#D4BBA6] text-[#4A3728]"
                        >
                            <CheckCheck className="w-4 h-4 mr-1" />
                            Mark all read
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeleteAll}
                            className="border-[#D4BBA6] text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Clear read
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-white border border-[#E8D5C4]">
                        <TabsTrigger value="all" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                            All
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                            Unread ({summary.total_unread})
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                            <Settings className="w-4 h-4 mr-1" />
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    {/* All / Unread Tabs Content */}
                    <TabsContent value="all" className="space-y-4">
                        <NotificationsList 
                            notifications={filteredNotifications}
                            loading={loading}
                            onMarkRead={handleMarkRead}
                            onClick={handleClick}
                            onDelete={handleDelete}
                            formatTime={formatTime}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            categoryFilter={categoryFilter}
                            setCategoryFilter={setCategoryFilter}
                            priorityFilter={priorityFilter}
                            setPriorityFilter={setPriorityFilter}
                            summary={summary}
                        />
                    </TabsContent>

                    <TabsContent value="unread" className="space-y-4">
                        <NotificationsList 
                            notifications={filteredNotifications.filter(n => !n.is_read)}
                            loading={loading}
                            onMarkRead={handleMarkRead}
                            onClick={handleClick}
                            onDelete={handleDelete}
                            formatTime={formatTime}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            categoryFilter={categoryFilter}
                            setCategoryFilter={setCategoryFilter}
                            priorityFilter={priorityFilter}
                            setPriorityFilter={setPriorityFilter}
                            summary={summary}
                            showUnreadOnly
                        />
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings">
                        <Card className="bg-white border-[#E8D5C4]">
                            <CardHeader>
                                <CardTitle className="text-[#4A3728]">Notification Preferences</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {preferences && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium text-[#4A3728]">Notification Categories</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    { key: 'task_notifications', label: 'Task Notifications', icon: ClipboardList },
                                                    { key: 'project_notifications', label: 'Project Updates', icon: Folder },
                                                    { key: 'marketing_notifications', label: 'Marketing Alerts', icon: Target },
                                                    { key: 'mail_notifications', label: 'Mail Notifications', icon: Mail },
                                                    { key: 'social_notifications', label: 'Social Updates', icon: Share2 },
                                                    { key: 'mention_notifications', label: 'Mentions', icon: MessageSquare },
                                                    { key: 'approval_notifications', label: 'Approvals', icon: Check },
                                                ].map(({ key, label, icon: Icon }) => (
                                                    <div key={key} className="flex items-center justify-between p-3 bg-[#FDF8F3] rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <Icon className="w-4 h-4 text-[#6B5D52]" />
                                                            <Label className="text-sm text-[#4A3728]">{label}</Label>
                                                        </div>
                                                        <Switch
                                                            checked={preferences[key]}
                                                            onCheckedChange={(v) => updatePreference(key, v)}
                                                            disabled={savingPrefs}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-[#E8D5C4]">
                                            <h3 className="text-sm font-medium text-[#4A3728]">Email Notifications</h3>
                                            <div className="flex items-center justify-between p-3 bg-[#FDF8F3] rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Mail className="w-4 h-4 text-[#6B5D52]" />
                                                    <Label className="text-sm text-[#4A3728]">Email Alerts</Label>
                                                </div>
                                                <Switch
                                                    checked={preferences.email_enabled}
                                                    onCheckedChange={(v) => updatePreference('email_enabled', v)}
                                                    disabled={savingPrefs}
                                                />
                                            </div>
                                            {preferences.email_enabled && (
                                                <div className="flex items-center gap-4 p-3 bg-[#FDF8F3] rounded-lg">
                                                    <Label className="text-sm text-[#4A3728]">Email Frequency</Label>
                                                    <Select
                                                        value={preferences.email_frequency}
                                                        onValueChange={(v) => updatePreference('email_frequency', v)}
                                                    >
                                                        <SelectTrigger className="w-40 border-[#D4BBA6]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white border-[#D4BBA6]">
                                                            <SelectItem value="instant">Instant</SelectItem>
                                                            <SelectItem value="hourly">Hourly Digest</SelectItem>
                                                            <SelectItem value="daily">Daily Digest</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

const NotificationsList = ({ 
    notifications, loading, onMarkRead, onClick, onDelete, formatTime,
    searchQuery, setSearchQuery, categoryFilter, setCategoryFilter,
    priorityFilter, setPriorityFilter, summary, showUnreadOnly
}) => {
    return (
        <>
            {/* Category Summary */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        categoryFilter === 'all' 
                            ? 'bg-[#4A3728] text-white' 
                            : 'bg-white border border-[#D4BBA6] text-[#6B5D52] hover:bg-[#F5EBE0]'
                    }`}
                >
                    All
                </button>
                {Object.entries(CATEGORY_CONFIG).map(([key, { label, icon: Icon, color }]) => {
                    const count = summary.by_category?.[key] || 0;
                    return (
                        <button
                            key={key}
                            onClick={() => setCategoryFilter(key)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${
                                categoryFilter === key 
                                    ? 'bg-[#4A3728] text-white' 
                                    : 'bg-white border border-[#D4BBA6] text-[#6B5D52] hover:bg-[#F5EBE0]'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                            {count > 0 && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                    {count}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8C74]" />
                    <Input
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 border-[#D4BBA6] bg-white"
                    />
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-36 border-[#D4BBA6] bg-white">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D4BBA6]">
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Notifications List */}
            <Card className="bg-white border-[#E8D5C4]">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-[#9C8C74]" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 text-[#9C8C74]">
                            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No notifications</p>
                            <p className="text-sm mt-1">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E8D5C4]">
                            {notifications.map((notification) => {
                                const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
                                const catConfig = CATEGORY_CONFIG[notification.category] || {};
                                const priorityClass = PRIORITY_STYLES[notification.priority] || '';
                                
                                return (
                                    <div 
                                        key={notification.id}
                                        className={`p-4 hover:bg-[#FDF8F3] cursor-pointer transition-colors ${priorityClass} ${
                                            !notification.is_read ? 'bg-[#FDF8F3]' : ''
                                        }`}
                                        onClick={() => onClick(notification)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${catConfig.color || 'bg-gray-100 text-gray-600'}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-medium text-[#4A3728]">
                                                        {notification.title}
                                                    </p>
                                                    {notification.priority === 'high' && (
                                                        <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
                                                            Urgent
                                                        </Badge>
                                                    )}
                                                    {!notification.is_read && (
                                                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-[#6B5D52]">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-xs text-[#9C8C74]">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                    {notification.category && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#D4BBA6] text-[#6B5D52]">
                                                            {notification.category}
                                                        </Badge>
                                                    )}
                                                    {notification.action_url && (
                                                        <span className="text-xs text-blue-600 flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3" />
                                                            View
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {!notification.is_read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMarkRead(notification);
                                                        }}
                                                        className="h-8 w-8 p-0 text-[#6B5D52] hover:text-[#4A3728]"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(notification);
                                                    }}
                                                    className="h-8 w-8 p-0 text-[#9C8C74] hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default NotificationCenter;
