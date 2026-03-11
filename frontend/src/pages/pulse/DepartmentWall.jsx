import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import {
    Building2,
    MessageCircle,
    Loader2,
    RefreshCw,
    ArrowLeft,
    Users,
    TrendingUp,
    Globe,
    ThumbsUp,
} from 'lucide-react';

const DEPARTMENTS = [
    { id: 'marketing', name: 'Marketing', color: 'bg-blue-500' },
    { id: 'buying', name: 'Buying', color: 'bg-green-500' },
    { id: 'warehouse', name: 'Warehouse', color: 'bg-amber-500' },
    { id: 'technology', name: 'Technology', color: 'bg-purple-500' },
    { id: 'operations', name: 'Operations', color: 'bg-slate-500' },
    { id: 'finance', name: 'Finance', color: 'bg-emerald-500' },
    { id: 'hr', name: 'HR', color: 'bg-pink-500' },
    { id: 'sales', name: 'Sales', color: 'bg-orange-500' },
    { id: 'leadership', name: 'Leadership', color: 'bg-rose-500' },
];

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

export default function DepartmentWall() {
    const { department: urlDepartment } = useParams();
    const { api, user } = useAuth();
    const [selectedDept, setSelectedDept] = useState(urlDepartment || 'marketing');
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0 });

    useEffect(() => {
        if (urlDepartment) {
            setSelectedDept(urlDepartment);
        }
    }, [urlDepartment]);

    useEffect(() => {
        fetchDepartmentFeed();
    }, [selectedDept]);

    const fetchDepartmentFeed = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/pulse/departments/${selectedDept}/feed?limit=30`);
            setPosts(response.data.posts || []);
            setStats({ total: response.data.total || 0 });
        } catch (error) {
            console.error('Failed to fetch department feed:', error);
            toast.error('Failed to load department feed');
        } finally {
            setLoading(false);
        }
    };

    const handleReaction = async (postId, reactionType) => {
        try {
            await api.post(`/pulse/posts/${postId}/reactions`, { reaction_type: reactionType });
            fetchDepartmentFeed();
        } catch (error) {
            toast.error('Failed to add reaction');
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const currentDeptConfig = DEPARTMENTS.find(d => d.id === selectedDept) || DEPARTMENTS[0];

    return (
        <div className="p-8 max-w-5xl mx-auto" data-testid="department-wall">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Link to="/pulse">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Feed
                        </Button>
                    </Link>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${currentDeptConfig.color}`}>
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 capitalize">
                                {currentDeptConfig.name} Wall
                            </h1>
                            <p className="text-gray-500">Department updates and announcements</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={selectedDept} onValueChange={setSelectedDept}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                                {DEPARTMENTS.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${dept.color}`} />
                                            {dept.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchDepartmentFeed} className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <MessageCircle className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-xs text-gray-500">Total Posts</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Users className="w-8 h-8 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold">{posts.length}</p>
                            <p className="text-xs text-gray-500">Recent Posts</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-purple-500" />
                        <div>
                            <p className="text-2xl font-bold capitalize">{selectedDept}</p>
                            <p className="text-xs text-gray-500">Department</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Posts Feed */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                </div>
            ) : posts.length === 0 ? (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-700">No posts in this department</h3>
                        <p className="text-gray-500 mt-1">Be the first to share an update!</p>
                        <Link to="/pulse">
                            <Button className="mt-4 bg-rose-600 hover:bg-rose-700">
                                Create Post
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {posts.map(post => (
                        <Card key={post.id} className={post.is_pinned ? 'ring-2 ring-amber-400' : ''}>
                            {post.is_pinned && (
                                <div className="bg-amber-50 px-4 py-1 text-xs text-amber-700">
                                    📌 Pinned Post
                                </div>
                            )}
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback className={`text-white ${currentDeptConfig.color}`}>
                                                {getInitials(post.author?.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{post.author?.name || 'Unknown'}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {POST_TYPE_ICONS[post.post_type] || '💬'} {post.post_type?.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                                <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>
                                
                                {post.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {post.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-2 pt-3 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleReaction(post.id, 'like')}
                                        className="gap-1"
                                    >
                                        👍 {post.reactions?.like || 0}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleReaction(post.id, 'celebrate')}
                                        className="gap-1"
                                    >
                                        🎉 {post.reactions?.celebrate || 0}
                                    </Button>
                                    <div className="flex-1" />
                                    <span className="text-sm text-gray-500">
                                        💬 {post.comment_count || 0} comments
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
