import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
    Activity, RefreshCw, Clock, User, Package, Target, Users,
    CheckCircle, Edit, Trash2, Mail, FileText, Calendar, Bell
} from 'lucide-react';

const actionIcons = {
    created: CheckCircle,
    updated: Edit,
    deleted: Trash2,
    status_changed: RefreshCw,
    email_sent: Mail,
    comment_added: FileText,
    assigned: User,
    meeting_scheduled: Calendar,
    notification_sent: Bell
};

const actionColors = {
    created: 'bg-green-100 text-green-700',
    updated: 'bg-blue-100 text-blue-700',
    deleted: 'bg-red-100 text-red-700',
    status_changed: 'bg-purple-100 text-purple-700',
    email_sent: 'bg-indigo-100 text-indigo-700',
    default: 'bg-gray-100 text-gray-700'
};

const moduleColors = {
    sourcing: 'bg-teal-100 text-teal-700 border-teal-200',
    marketing: 'bg-amber-100 text-amber-700 border-amber-200',
    sales: 'bg-stone-100 text-stone-700 border-stone-200',
    hr: 'bg-pink-100 text-pink-700 border-pink-200',
    tasks: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    projects: 'bg-rose-100 text-rose-700 border-rose-200'
};

export default function ActivityFeedPage() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [moduleFilter, setModuleFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');

    useEffect(() => {
        fetchActivities();
    }, [moduleFilter, entityFilter]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (moduleFilter !== 'all') params.append('module', moduleFilter);
            if (entityFilter !== 'all') params.append('entity_type', entityFilter);
            params.append('limit', '100');
            
            const response = await api.get(`/tasks/activities/feed?${params.toString()}`);
            setActivities(response.data || []);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
            toast.error('Failed to load activity feed');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getActionDescription = (activity) => {
        const { action, entity_type, entity_name, action_details } = activity;
        const entityDisplay = entity_name || entity_type;

        switch (action) {
            case 'created':
                return `created ${entity_type} "${entityDisplay}"`;
            case 'updated':
                return `updated ${entity_type} "${entityDisplay}"`;
            case 'deleted':
                return `deleted ${entity_type} "${entityDisplay}"`;
            case 'status_changed':
                if (action_details?.status) {
                    return `changed status of "${entityDisplay}" to ${action_details.status}`;
                }
                return `changed status of "${entityDisplay}"`;
            case 'email_sent':
                return `sent email to "${entityDisplay}"`;
            default:
                if (action.startsWith('status_changed_to_')) {
                    const status = action.replace('status_changed_to_', '');
                    return `marked "${entityDisplay}" as ${status}`;
                }
                return `${action.replace(/_/g, ' ')} "${entityDisplay}"`;
        }
    };

    const groupActivitiesByDate = (activities) => {
        const groups = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        activities.forEach(activity => {
            const actDate = new Date(activity.created_at).toDateString();
            let groupKey;
            
            if (actDate === today) {
                groupKey = 'Today';
            } else if (actDate === yesterday) {
                groupKey = 'Yesterday';
            } else {
                groupKey = new Date(activity.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                });
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(activity);
        });

        return groups;
    };

    const groupedActivities = groupActivitiesByDate(activities);

    return (
        <div className="min-h-screen bg-[#F5EBE0] p-6" data-testid="activity-feed-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#5C4033]">Activity Feed</h1>
                    <p className="text-[#8B7355]">Track all actions across modules</p>
                </div>
                <Button 
                    onClick={fetchActivities}
                    variant="outline"
                    className="border-[#DDD0C8] text-[#8B7355]"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card className="bg-white/80 border-[#DDD0C8] mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <Select value={moduleFilter} onValueChange={setModuleFilter}>
                            <SelectTrigger className="w-[180px] border-[#DDD0C8] bg-white">
                                <SelectValue placeholder="Filter by module" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Modules</SelectItem>
                                <SelectItem value="sourcing">Sourcing</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="sales">Sales</SelectItem>
                                <SelectItem value="hr">HR</SelectItem>
                                <SelectItem value="tasks">Tasks</SelectItem>
                                <SelectItem value="projects">Projects</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                            <SelectTrigger className="w-[180px] border-[#DDD0C8] bg-white">
                                <SelectValue placeholder="Filter by entity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Entities</SelectItem>
                                <SelectItem value="brand">Brands</SelectItem>
                                <SelectItem value="supplier">Suppliers</SelectItem>
                                <SelectItem value="manufacturer">Manufacturers</SelectItem>
                                <SelectItem value="task">Tasks</SelectItem>
                                <SelectItem value="campaign">Campaigns</SelectItem>
                                <SelectItem value="employee">Employees</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="bg-white/80 border-[#DDD0C8]">
                <CardHeader className="border-b border-[#DDD0C8]">
                    <CardTitle className="text-[#5C4033] flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription className="text-[#8B7355]">
                        {activities.length} activities recorded
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 animate-spin text-[#8B7355]" />
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity className="w-12 h-12 text-[#DDD0C8] mx-auto mb-4" />
                            <p className="text-[#8B7355]">No activities recorded yet</p>
                            <p className="text-sm text-[#8B7355] mt-1">
                                Activities will appear here as you work across modules
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#DDD0C8]">
                            {Object.entries(groupedActivities).map(([dateGroup, dateActivities]) => (
                                <div key={dateGroup}>
                                    <div className="px-4 py-2 bg-[#F5EBE0]/50">
                                        <span className="text-sm font-medium text-[#8B7355]">{dateGroup}</span>
                                    </div>
                                    {dateActivities.map((activity) => {
                                        const ActionIcon = actionIcons[activity.action] || actionIcons[activity.action?.split('_')[0]] || Activity;
                                        const actionColor = actionColors[activity.action] || actionColors[activity.action?.split('_')[0]] || actionColors.default;
                                        const moduleColor = moduleColors[activity.module] || 'bg-gray-100 text-gray-700';

                                        return (
                                            <div 
                                                key={activity.id}
                                                className="px-4 py-3 hover:bg-[#F5EBE0]/30 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${actionColor}`}>
                                                        <ActionIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-[#5C4033]">
                                                                {activity.user_name || 'System'}
                                                            </span>
                                                            <span className="text-[#8B7355]">
                                                                {getActionDescription(activity)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge className={`${moduleColor} text-xs`}>
                                                                {activity.module}
                                                            </Badge>
                                                            <span className="text-xs text-[#8B7355] flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {formatTimestamp(activity.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
