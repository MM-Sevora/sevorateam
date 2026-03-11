import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    User,
    MessageCircle,
    Award,
    Calendar,
    CalendarRange,
    Loader2,
    ArrowLeft,
    Mail,
    Building2,
    Trophy,
    CheckCircle,
    Clock,
    Heart,
    ThumbsUp,
} from 'lucide-react';

const BADGE_CONFIG = {
    team_player: { label: 'Team Player', emoji: '🤝', color: 'bg-blue-500' },
    problem_solver: { label: 'Problem Solver', emoji: '🧩', color: 'bg-emerald-500' },
    innovation: { label: 'Innovation', emoji: '💡', color: 'bg-amber-500' },
    execution_champion: { label: 'Execution Champion', emoji: '🏆', color: 'bg-purple-500' },
    mentor: { label: 'Mentor', emoji: '🎓', color: 'bg-pink-500' },
    customer_hero: { label: 'Customer Hero', emoji: '⭐', color: 'bg-red-500' },
};

const POST_TYPE_ICONS = {
    announcement: '📢',
    operational: '⚙️',
    achievement: '🏆',
    issue: '⚠️',
    appreciation: '❤️',
    daily_update: '📅',
    weekly_update: '📊',
    update: '💬',
};

export default function EmployeeProfile() {
    const { employeeId } = useParams();
    const { api, user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        if (employeeId) {
            fetchProfile();
            fetchActivities();
        }
    }, [employeeId]);

    useEffect(() => {
        fetchActivities();
    }, [activeTab]);

    const fetchProfile = async () => {
        try {
            const response = await api.get(`/pulse/employees/${employeeId}/profile`);
            setProfile(response.data);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            toast.error('Failed to load employee profile');
        }
    };

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const typeParam = activeTab !== 'all' ? `?activity_type=${activeTab}` : '';
            const response = await api.get(`/pulse/employees/${employeeId}/activity${typeParam}`);
            setActivities(response.data.activities || []);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderActivity = (activity) => {
        switch (activity.type) {
            case 'post':
                return (
                    <div key={activity.id} className="flex gap-4 p-4 bg-white border border-[#E8D5C4] rounded-xl hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-lg bg-[#E8D5C4]/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">{POST_TYPE_ICONS[activity.post_type] || '💬'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs capitalize border-[#E8D5C4]">
                                    {activity.post_type?.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-[#9C8C74]">{formatDate(activity.created_at)}</span>
                            </div>
                            <h4 className="font-medium text-[#4A3728] mb-1">{activity.title}</h4>
                            <p className="text-sm text-[#5D4A3A] line-clamp-2">{activity.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-[#9C8C74]">
                                <span className="flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" />
                                    {activity.reactions?.like || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    {activity.comment_count || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            
            case 'recognition_received':
                const badge = BADGE_CONFIG[activity.badge_type] || {};
                return (
                    <div key={activity.id} className="flex gap-4 p-4 bg-white border border-[#E8D5C4] rounded-xl hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 rounded-lg ${badge.color || 'bg-pink-500'} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-lg">{badge.emoji}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge className={`${badge.color} text-white text-xs`}>
                                    {badge.label}
                                </Badge>
                                <span className="text-xs text-[#9C8C74]">{formatDate(activity.created_at)}</span>
                            </div>
                            <p className="text-sm text-[#5D4A3A] italic">"{activity.reason}"</p>
                            <p className="text-xs text-[#9C8C74] mt-1">
                                Recognized by {activity.giver_name}
                            </p>
                        </div>
                    </div>
                );
            
            case 'daily_update':
                return (
                    <div key={activity.id} className="flex gap-4 p-4 bg-white border border-[#E8D5C4] rounded-xl hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700">
                                    Daily Update
                                </Badge>
                                <span className="text-xs text-[#9C8C74]">{activity.date}</span>
                            </div>
                            <div className="space-y-1">
                                {activity.completed_tasks?.slice(0, 3).map((task, i) => (
                                    <p key={i} className="text-sm text-[#5D4A3A] flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        {task}
                                    </p>
                                ))}
                                {activity.completed_tasks?.length > 3 && (
                                    <p className="text-xs text-[#9C8C74]">+{activity.completed_tasks.length - 3} more tasks</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            
            case 'weekly_update':
                return (
                    <div key={activity.id} className="flex gap-4 p-4 bg-white border border-[#E8D5C4] rounded-xl hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <CalendarRange className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs border-violet-200 text-violet-700">
                                    Weekly Update
                                </Badge>
                                <span className="text-xs text-[#9C8C74]">Week of {activity.week_start}</span>
                            </div>
                            <div className="space-y-1">
                                {activity.achievements?.slice(0, 3).map((item, i) => (
                                    <p key={i} className="text-sm text-[#5D4A3A] flex items-center gap-2">
                                        <Trophy className="w-3 h-3 text-violet-500" />
                                        {item}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            </div>
        );
    }

    const { employee, stats } = profile;

    return (
        <div className="p-8 max-w-5xl mx-auto" data-testid="employee-profile">
            {/* Back Button */}
            <Link to="/pulse">
                <Button variant="ghost" size="sm" className="mb-4 gap-2 text-[#4A3728] hover:bg-[#F5EBE0]">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Feed
                </Button>
            </Link>

            {/* Profile Header */}
            <Card className="bg-white border-[#E8D5C4] mb-6">
                <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                        <Avatar className="w-24 h-24">
                            <AvatarImage src={employee.avatar} />
                            <AvatarFallback className="bg-[#E8D5C4] text-[#4A3728] text-2xl">
                                {getInitials(employee.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-[#4A3728]">{employee.name}</h1>
                            <div className="flex items-center gap-4 mt-2 text-[#5D4A3A]">
                                <span className="flex items-center gap-1 capitalize">
                                    <Building2 className="w-4 h-4" />
                                    {employee.department}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    {employee.email}
                                </span>
                            </div>
                            <Badge variant="outline" className="mt-2 capitalize border-[#E8D5C4]">
                                {employee.role?.replace('_', ' ')}
                            </Badge>
                        </div>
                        {user?.id !== employeeId && (
                            <Link to={`/pulse/recognition?recipient=${employeeId}`}>
                                <Button className="bg-rose-600 hover:bg-rose-700 gap-2">
                                    <Award className="w-4 h-4" />
                                    Give Recognition
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <Card className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 rounded-lg bg-[#E8D5C4]/50 flex items-center justify-center mx-auto mb-2">
                            <MessageCircle className="w-5 h-5 text-[#4A3728]" />
                        </div>
                        <p className="text-2xl font-bold text-[#4A3728]">{stats.posts_count}</p>
                        <p className="text-xs text-[#5D4A3A]">Posts</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center mx-auto mb-2">
                            <Award className="w-5 h-5 text-rose-600" />
                        </div>
                        <p className="text-2xl font-bold text-[#4A3728]">{stats.recognitions_received}</p>
                        <p className="text-xs text-[#5D4A3A]">Badges Received</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center mx-auto mb-2">
                            <Heart className="w-5 h-5 text-pink-600" />
                        </div>
                        <p className="text-2xl font-bold text-[#4A3728]">{stats.recognitions_given}</p>
                        <p className="text-xs text-[#5D4A3A]">Badges Given</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-[#4A3728]">{stats.daily_updates}</p>
                        <p className="text-xs text-[#5D4A3A]">Daily Updates</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center mx-auto mb-2">
                            <CalendarRange className="w-5 h-5 text-violet-600" />
                        </div>
                        <p className="text-2xl font-bold text-[#4A3728]">{stats.weekly_updates}</p>
                        <p className="text-xs text-[#5D4A3A]">Weekly Updates</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4 text-center">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-2">
                            <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-[#4A3728]">{stats.total_badges}</p>
                        <p className="text-xs text-[#5D4A3A]">Total Badges</p>
                    </CardContent>
                </Card>
            </div>

            {/* Badge Breakdown */}
            {stats.total_badges > 0 && (
                <Card className="bg-white border-[#E8D5C4] mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                            <Award className="w-5 h-5" />
                            Badge Collection
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(stats.badges_by_type || {}).map(([type, count]) => {
                                const badge = BADGE_CONFIG[type] || {};
                                return (
                                    <div key={type} className="flex items-center gap-2 px-3 py-2 bg-[#F5EBE0] rounded-lg">
                                        <span className="text-xl">{badge.emoji}</span>
                                        <span className="text-sm font-medium text-[#4A3728]">{badge.label}</span>
                                        <Badge variant="secondary">{count}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Activity Timeline */}
            <Card className="bg-white border-[#E8D5C4]">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Activity Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">All Activity</TabsTrigger>
                            <TabsTrigger value="posts">Posts</TabsTrigger>
                            <TabsTrigger value="recognitions">Recognitions</TabsTrigger>
                            <TabsTrigger value="updates">Updates</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab}>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-12 text-[#9C8C74]">
                                    <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No activity found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activities.map(renderActivity)}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
