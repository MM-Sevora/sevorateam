import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import {
    BarChart3,
    Users,
    MessageCircle,
    Trophy,
    AlertTriangle,
    TrendingUp,
    Building2,
    Award,
    Loader2,
    RefreshCw,
    ChevronRight,
    Calendar,
} from 'lucide-react';

export default function LeadershipDashboard() {
    const { api } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState(null);

    useEffect(() => {
        fetchDashboard();
        fetchLeaderboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const response = await api.get('/pulse/leadership/dashboard');
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const response = await api.get('/pulse/recognition/leaderboard?period=month');
            setLeaderboard(response.data);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto" data-testid="leadership-dashboard">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leadership Dashboard</h1>
                    <p className="text-gray-500 mt-1">Overview of team activity and engagement</p>
                </div>
                <Button variant="outline" onClick={fetchDashboard} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <Card>
                    <CardContent className="p-4 text-center">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{data?.overview?.total_posts || 0}</p>
                        <p className="text-xs text-gray-500">Total Posts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold">{data?.overview?.posts_today || 0}</p>
                        <p className="text-xs text-gray-500">Posts Today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                        <p className="text-2xl font-bold">{data?.overview?.posts_this_week || 0}</p>
                        <p className="text-xs text-gray-500">This Week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Award className="w-8 h-8 mx-auto mb-2 text-pink-500" />
                        <p className="text-2xl font-bold">{data?.overview?.total_recognitions || 0}</p>
                        <p className="text-xs text-gray-500">Recognitions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                        <p className="text-2xl font-bold">{data?.overview?.achievements_this_week || 0}</p>
                        <p className="text-xs text-gray-500">Achievements</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="text-2xl font-bold">{data?.overview?.issues_this_week || 0}</p>
                        <p className="text-xs text-gray-500">Issues Raised</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Department Activity */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Department Activity (This Week)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data?.departments?.length > 0 ? (
                                data.departments.map((dept, idx) => (
                                    <div key={dept.name} className="flex items-center gap-4">
                                        <div className="w-24 text-sm font-medium capitalize truncate">
                                            {dept.name}
                                        </div>
                                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, (dept.posts / Math.max(...data.departments.map(d => d.posts))) * 100)}%`
                                                }}
                                            />
                                        </div>
                                        <div className="text-sm text-gray-600 w-20 text-right">
                                            {dept.posts} posts
                                        </div>
                                        <div className="text-xs text-gray-400 w-20">
                                            {dept.contributors} contributors
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No department data yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Contributors */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Top Contributors
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data?.top_contributors?.length > 0 ? (
                                data.top_contributors.map((user, idx) => (
                                    <div key={user.user_id} className="flex items-center gap-3">
                                        <div className="w-6 text-center">
                                            {idx === 0 && <span className="text-amber-500">🥇</span>}
                                            {idx === 1 && <span className="text-gray-400">🥈</span>}
                                            {idx === 2 && <span className="text-amber-700">🥉</span>}
                                            {idx > 2 && <span className="text-gray-400 text-sm">{idx + 1}</span>}
                                        </div>
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-rose-100 text-rose-700 text-xs">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{user.department}</p>
                                        </div>
                                        <Badge variant="secondary">{user.posts} posts</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No contributors yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Issues */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Recent Issues
                            </CardTitle>
                            <Link to="/pulse?type=issue">
                                <Button variant="ghost" size="sm">
                                    View All <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data?.recent_issues?.length > 0 ? (
                                data.recent_issues.map((issue) => (
                                    <div key={issue.id} className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm font-medium text-red-900 line-clamp-1">{issue.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-red-700">
                                            <span>{issue.author_name}</span>
                                            <span>•</span>
                                            <span className="capitalize">{issue.department}</span>
                                            {issue.priority === 'urgent' && (
                                                <Badge variant="destructive" className="text-xs">Urgent</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No recent issues</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Achievements */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                Recent Achievements
                            </CardTitle>
                            <Link to="/pulse?type=achievement">
                                <Button variant="ghost" size="sm">
                                    View All <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data?.recent_achievements?.length > 0 ? (
                                data.recent_achievements.map((achievement) => (
                                    <div key={achievement.id} className="p-3 bg-amber-50 rounded-lg">
                                        <p className="text-sm font-medium text-amber-900 line-clamp-1">{achievement.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-amber-700">
                                            <span>{achievement.author_name}</span>
                                            <span>•</span>
                                            <span className="capitalize">{achievement.department}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No recent achievements</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recognition Leaderboard */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="w-5 h-5 text-pink-500" />
                                Badge Leaderboard
                            </CardTitle>
                            <Link to="/pulse/recognition">
                                <Button variant="ghost" size="sm">
                                    View All <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {leaderboard?.leaderboard?.length > 0 ? (
                                leaderboard.leaderboard.slice(0, 5).map((user, idx) => (
                                    <div key={user.user_id} className="flex items-center gap-3">
                                        <div className="w-6 text-center">
                                            {idx === 0 && <span>🥇</span>}
                                            {idx === 1 && <span>🥈</span>}
                                            {idx === 2 && <span>🥉</span>}
                                            {idx > 2 && <span className="text-gray-400 text-sm">{idx + 1}</span>}
                                        </div>
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-pink-100 text-pink-700 text-xs">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{user.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Award className="w-4 h-4 text-pink-500" />
                                            <span className="text-sm font-medium">{user.badge_count}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No badges awarded yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
