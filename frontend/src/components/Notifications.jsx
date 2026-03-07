import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Bell, Check, CheckCheck, MessageSquare, UserPlus, Target, PenTool, X } from 'lucide-react';
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

const NOTIFICATION_ICONS = {
    mention: MessageSquare,
    new_lead: UserPlus,
    campaign_update: Target,
    content_update: PenTool,
    default: Bell
};

const NOTIFICATION_COLORS = {
    mention: 'text-amber-700',
    new_lead: 'text-stone-600',
    campaign_update: 'text-amber-600',
    content_update: 'text-rose-600',
    default: 'text-[#5D4A3A]'
};

export const NotificationsDropdown = () => {
    const { notifications, unreadCount, markNotificationRead, isConnected } = useWebSocket();

    const handleMarkRead = async (notificationId) => {
        markNotificationRead(notificationId);
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/collaboration/notifications/read-all');
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

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
                    {unreadCount > 0 && (
                        <Badge 
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                    {isConnected && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-80 bg-white border-[#D4BBA6] shadow-lg"
            >
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="text-[#4A3728]">Notifications</span>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs text-[#4A3728] hover:text-[#3A2A1E]"
                            onClick={handleMarkAllRead}
                        >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E8D5C4]" />
                
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-[#5D4A3A]">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
                            const colorClass = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.default;
                            
                            return (
                                <div 
                                    key={notification.id}
                                    className={`p-3 hover:bg-[#F5EDE5] cursor-pointer border-b border-[#E8D5C4] ${
                                        !notification.read ? 'bg-[#F5EDE5]' : ''
                                    }`}
                                    onClick={() => !notification.read && handleMarkRead(notification.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full bg-[#E8D5C4] flex items-center justify-center ${colorClass}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#4A3728] font-medium truncate">
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-[#5D4A3A] truncate">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-[#D4BBA6] mt-1">
                                                {formatTime(notification.created_at)}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <span className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0 mt-2" />
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
