import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
    Bell, Check, CheckCheck, MessageSquare, UserPlus, Target, PenTool, X,
    ClipboardList, Folder, Mail, Share2, AlertTriangle, Clock, Filter,
    Trash2, Settings, ExternalLink
} from 'lucide-react';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import api from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const NOTIFICATION_ICONS = {
    // Task
    task_assigned: ClipboardList,
    task_status_changed: ClipboardList,
    task_due_soon: Clock,
    task_overdue: AlertTriangle,
    task_comment: MessageSquare,
    task_completed: Check,
    // Project
    project_created: Folder,
    project_status_changed: Folder,
    project_member_added: UserPlus,
    // Marketing
    campaign_created: Target,
    campaign_approved: Target,
    influencer_confirmed: UserPlus,
    content_published: PenTool,
    // Mail
    email_received: Mail,
    email_sent: Mail,
    // Social
    post_scheduled: Share2,
    post_published: Share2,
    engagement_alert: Target,
    // Mention
    user_mentioned: MessageSquare,
    mention: MessageSquare,
    // System
    system_alert: AlertTriangle,
    welcome: Bell,
    // Defaults
    default: Bell
};

const NOTIFICATION_COLORS = {
    task: 'text-blue-600 bg-blue-50',
    project: 'text-purple-600 bg-purple-50',
    marketing: 'text-orange-600 bg-orange-50',
    mail: 'text-green-600 bg-green-50',
    social: 'text-pink-600 bg-pink-50',
    mention: 'text-amber-600 bg-amber-50',
    approval: 'text-red-600 bg-red-50',
    system: 'text-gray-600 bg-gray-50',
    reminder: 'text-cyan-600 bg-cyan-50',
    default: 'text-[#5D4A3A] bg-[#F5EDE5]'
};

const PRIORITY_STYLES = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-amber-500',
    low: 'border-l-4 border-l-gray-300'
};

export const NotificationsDropdown = () => {
    const { notifications, unreadCount, markNotificationRead, isConnected, isPolling } = useWebSocket();
    const [loading, setLoading] = useState(false);
    const [dbNotifications, setDbNotifications] = useState([]);
    const navigate = useNavigate();

    // Fetch notifications from DB on mount and periodically if polling
    useEffect(() => {
        fetchNotifications();
    }, []);
    
    // Refresh when polling mode brings new notifications
    useEffect(() => {
        if (isPolling) {
            const refreshInterval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(refreshInterval);
        }
    }, [isPolling]);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications?limit=20');
            setDbNotifications(res.data);
        } catch (e) {
            console.error('Failed to fetch notifications:', e);
        }
    };

    // Merge WebSocket notifications with DB notifications
    const allNotifications = [...notifications, ...dbNotifications.filter(
        dbN => !notifications.find(wsN => wsN.id === dbN.id)
    )].slice(0, 20);

    const handleMarkRead = async (notification) => {
        markNotificationRead(notification.id);
        try {
            await api.put(`/notifications/${notification.id}/read`);
            setDbNotifications(prev => prev.map(n => 
                n.id === notification.id ? { ...n, is_read: true } : n
            ));
        } catch (e) {
            console.error('Failed to mark as read:', e);
        }
    };

    const handleMarkAllRead = async () => {
        setLoading(true);
        try {
            await api.put('/notifications/read-all');
            setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            toast.success('All notifications marked as read');
        } catch (e) {
            toast.error('Failed to mark all as read');
        } finally {
            setLoading(false);
        }
    };

    const handleClick = (notification) => {
        if (!notification.is_read && !notification.read) {
            handleMarkRead(notification);
        }
        if (notification.action_url) {
            navigate(notification.action_url);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    const actualUnreadCount = allNotifications.filter(n => !n.is_read && !n.read).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative hover:bg-[#E8D5C4]"
                    data-testid="notifications-btn"
                >
                    <Bell className="w-5 h-5 text-[#4A3728]" />
                    {actualUnreadCount > 0 && (
                        <Badge 
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                        >
                            {actualUnreadCount > 9 ? '9+' : actualUnreadCount}
                        </Badge>
                    )}
                    {isConnected && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full" title="Live updates" />
                    )}
                    {!isConnected && isPolling && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Polling for updates" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-96 bg-white border-[#D4BBA6] shadow-lg"
            >
                <DropdownMenuLabel className="flex items-center justify-between py-3">
                    <span className="text-[#4A3728] font-semibold">Notifications</span>
                    <div className="flex items-center gap-2">
                        {actualUnreadCount > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs text-[#4A3728] hover:text-[#3A2A1E]"
                                onClick={handleMarkAllRead}
                                disabled={loading}
                            >
                                <CheckCheck className="w-3 h-3 mr-1" />
                                Mark all read
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#4A3728]"
                            onClick={() => navigate('/notifications')}
                        >
                            View all
                        </Button>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E8D5C4]" />
                
                <ScrollArea className="h-[400px]">
                    {allNotifications.length === 0 ? (
                        <div className="p-8 text-center text-[#5D4A3A]">
                            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">No notifications</p>
                            <p className="text-xs mt-1 opacity-70">You're all caught up!</p>
                        </div>
                    ) : (
                        allNotifications.map((notification) => {
                            const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
                            const colorClass = NOTIFICATION_COLORS[notification.category] || NOTIFICATION_COLORS.default;
                            const priorityClass = PRIORITY_STYLES[notification.priority] || '';
                            const isUnread = !notification.is_read && !notification.read;
                            
                            return (
                                <div 
                                    key={notification.id}
                                    className={`p-3 hover:bg-[#F5EDE5] cursor-pointer border-b border-[#E8D5C4] transition-colors ${
                                        isUnread ? 'bg-[#FDF8F3]' : ''
                                    } ${priorityClass}`}
                                    onClick={() => handleClick(notification)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-[#4A3728] font-medium truncate">
                                                    {notification.title}
                                                </p>
                                                {notification.priority === 'high' && (
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-200 bg-red-50">
                                                        Urgent
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#5D4A3A] mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-[#9C8C74]">
                                                    {formatTime(notification.created_at)}
                                                </span>
                                                {notification.category && (
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-[#6B5D52] border-[#D4BBA6]">
                                                        {notification.category}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {isUnread && (
                                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 mt-1" />
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const OnlineUsersIndicator = () => {
    const { onlineUsers, isConnected } = useWebSocket();

    if (!isConnected) return null;

    return (
        <div className="flex items-center gap-2 text-xs text-[#5D4A3A]">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>{onlineUsers} online</span>
        </div>
    );
};

export default NotificationsDropdown;
