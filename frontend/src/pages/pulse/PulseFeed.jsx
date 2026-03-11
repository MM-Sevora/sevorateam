import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
    Megaphone,
    Settings,
    Trophy,
    AlertTriangle,
    Heart,
    Calendar,
    CalendarRange,
    MessageCircle,
    ThumbsUp,
    PartyPopper,
    Lightbulb,
    Send,
    MoreHorizontal,
    Pin,
    Trash2,
    Edit,
    Filter,
    Search,
    Plus,
    Users,
    Building2,
    Globe,
    Lock,
    RefreshCw,
    TrendingUp,
    Loader2,
    ImageIcon,
    Paperclip,
    X,
    ChevronDown,
} from 'lucide-react';

const POST_TYPE_CONFIG = {
    announcement: { label: 'Announcement', icon: Megaphone, color: 'bg-blue-500' },
    operational: { label: 'Operational', icon: Settings, color: 'bg-gray-500' },
    achievement: { label: 'Achievement', icon: Trophy, color: 'bg-amber-500' },
    issue: { label: 'Issue/Alert', icon: AlertTriangle, color: 'bg-red-500' },
    appreciation: { label: 'Appreciation', icon: Heart, color: 'bg-pink-500' },
    daily_update: { label: 'Daily Update', icon: Calendar, color: 'bg-emerald-500' },
    weekly_update: { label: 'Weekly Update', icon: CalendarRange, color: 'bg-violet-500' },
    update: { label: 'Update', icon: MessageCircle, color: 'bg-slate-500' },
};

const REACTION_CONFIG = {
    like: { emoji: '👍', label: 'Like' },
    celebrate: { emoji: '🎉', label: 'Celebrate' },
    appreciate: { emoji: '❤️', label: 'Appreciate' },
    idea: { emoji: '💡', label: 'Great Idea' },
};

const VISIBILITY_CONFIG = {
    public: { icon: Globe, label: 'Everyone', color: 'text-green-600' },
    department: { icon: Building2, label: 'Department', color: 'text-blue-600' },
    team: { icon: Users, label: 'Team', color: 'text-purple-600' },
    private: { icon: Lock, label: 'Private', color: 'text-gray-600' },
};

const DEPARTMENTS = [
    'marketing', 'buying', 'warehouse', 'technology',
    'operations', 'finance', 'hr', 'sales', 'leadership'
];

export default function PulseFeed() {
    const { api, user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterTime, setFilterTime] = useState('all');
    
    // Create post form
    const [newPost, setNewPost] = useState({
        title: '',
        content: '',
        post_type: 'update',
        visibility: 'public',
        department: '',
        tags: [],
        priority: 'normal',
    });
    const [tagInput, setTagInput] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPosts();
        fetchStats();
    }, [filterDepartment, filterType, filterTime]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            let url = '/pulse/posts?limit=30';
            if (filterDepartment && filterDepartment !== 'all') url += `&department=${filterDepartment}`;
            if (filterType && filterType !== 'all') url += `&post_type=${filterType}`;
            if (filterTime && filterTime !== 'all') url += `&time_filter=${filterTime}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            const response = await api.get(url);
            setPosts(response.data.posts || []);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            toast.error('Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/pulse/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.title.trim() || !newPost.content.trim()) {
            toast.error('Please fill in title and content');
            return;
        }
        
        setSubmitting(true);
        try {
            await api.post('/pulse/posts', {
                ...newPost,
                department: newPost.department || user?.department || 'general',
            });
            toast.success('Post created successfully!');
            setShowCreateDialog(false);
            setNewPost({
                title: '',
                content: '',
                post_type: 'update',
                visibility: 'public',
                department: '',
                tags: [],
                priority: 'normal',
            });
            fetchPosts();
            fetchStats();
        } catch (error) {
            toast.error('Failed to create post');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReaction = async (postId, reactionType) => {
        try {
            const response = await api.post(`/pulse/posts/${postId}/reactions`, {
                reaction_type: reactionType
            });
            // Update local state
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    const reactions = { ...post.reactions };
                    if (response.data.action === 'added') {
                        reactions[reactionType] = (reactions[reactionType] || 0) + 1;
                    } else if (response.data.action === 'removed') {
                        reactions[reactionType] = Math.max(0, (reactions[reactionType] || 1) - 1);
                    }
                    return { ...post, reactions, user_reaction: response.data.action === 'removed' ? null : reactionType };
                }
                return post;
            }));
        } catch (error) {
            toast.error('Failed to add reaction');
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await api.delete(`/pulse/posts/${postId}`);
            toast.success('Post deleted');
            fetchPosts();
        } catch (error) {
            toast.error('Failed to delete post');
        }
    };

    const handlePinPost = async (postId) => {
        try {
            const response = await api.post(`/pulse/posts/${postId}/pin`);
            toast.success(response.data.is_pinned ? 'Post pinned' : 'Post unpinned');
            fetchPosts();
        } catch (error) {
            toast.error('Failed to pin post');
        }
    };

    const addTag = () => {
        if (tagInput.trim() && !newPost.tags.includes(tagInput.trim())) {
            setNewPost({ ...newPost, tags: [...newPost.tags, tagInput.trim()] });
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        setNewPost({ ...newPost, tags: newPost.tags.filter(t => t !== tag) });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto" data-testid="pulse-feed">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Sevora Pulse</h1>
                        <p className="text-gray-500 mt-1">Company updates, achievements, and team activity</p>
                    </div>
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="gap-2 bg-rose-600 hover:bg-rose-700"
                    >
                        <Plus className="w-4 h-4" />
                        Create Post
                    </Button>
                </div>

                {/* Stats Row */}
                {stats && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-100">
                                        <MessageCircle className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.posts_today}</p>
                                        <p className="text-xs text-gray-500">Posts Today</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-100">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.posts_this_week}</p>
                                        <p className="text-xs text-gray-500">This Week</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-100">
                                        <Users className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.top_contributors?.length || 0}</p>
                                        <p className="text-xs text-gray-500">Active Contributors</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-100">
                                        <Trophy className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.by_type?.achievement || 0}</p>
                                        <p className="text-xs text-gray-500">Achievements</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search posts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
                            className="pl-9"
                        />
                    </div>
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
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Post Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {Object.entries(POST_TYPE_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterTime} onValueChange={setFilterTime}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchPosts} className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Posts Feed */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                </div>
            ) : posts.length === 0 ? (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-700">No posts yet</h3>
                        <p className="text-gray-500 mt-1">Be the first to share an update!</p>
                        <Button 
                            onClick={() => setShowCreateDialog(true)}
                            className="mt-4 bg-rose-600 hover:bg-rose-700"
                        >
                            Create First Post
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {posts.map(post => {
                        const typeConfig = POST_TYPE_CONFIG[post.post_type] || POST_TYPE_CONFIG.update;
                        const TypeIcon = typeConfig.icon;
                        const visConfig = VISIBILITY_CONFIG[post.visibility] || VISIBILITY_CONFIG.public;
                        const VisIcon = visConfig.icon;
                        
                        return (
                            <Card 
                                key={post.id} 
                                className={`overflow-hidden ${post.is_pinned ? 'ring-2 ring-amber-400' : ''}`}
                            >
                                {post.is_pinned && (
                                    <div className="bg-amber-50 px-4 py-1 text-xs text-amber-700 flex items-center gap-1">
                                        <Pin className="w-3 h-3" /> Pinned Post
                                    </div>
                                )}
                                <CardContent className="p-5">
                                    {/* Post Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={post.author?.avatar} />
                                                <AvatarFallback className="bg-rose-100 text-rose-700">
                                                    {getInitials(post.author?.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{post.author?.name || 'Unknown'}</span>
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                        {post.department}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>{formatDate(post.created_at)}</span>
                                                    <span>•</span>
                                                    <VisIcon className={`w-3 h-3 ${visConfig.color}`} />
                                                    <span>{visConfig.label}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${typeConfig.color} text-white gap-1`}>
                                                <TypeIcon className="w-3 h-3" />
                                                {typeConfig.label}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {(user?.role === 'superadmin' || user?.role === 'admin') && (
                                                        <DropdownMenuItem onClick={() => handlePinPost(post.id)}>
                                                            <Pin className="w-4 h-4 mr-2" />
                                                            {post.is_pinned ? 'Unpin' : 'Pin'} Post
                                                        </DropdownMenuItem>
                                                    )}
                                                    {post.author_id === user?.id && (
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeletePost(post.id)}>
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Post Content */}
                                    <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>

                                    {/* Tags */}
                                    {post.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {post.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reactions & Comments Bar */}
                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <div className="flex items-center gap-1">
                                            {Object.entries(REACTION_CONFIG).map(([type, config]) => {
                                                const count = post.reactions?.[type] || 0;
                                                const isActive = post.user_reaction === type;
                                                return (
                                                    <Button
                                                        key={type}
                                                        variant={isActive ? 'secondary' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => handleReaction(post.id, type)}
                                                        className={`gap-1 ${isActive ? 'bg-gray-200' : ''}`}
                                                    >
                                                        <span>{config.emoji}</span>
                                                        {count > 0 && <span className="text-xs">{count}</span>}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.comment_count || 0} Comments
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Post Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Post Type & Visibility */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Post Type</label>
                                <Select 
                                    value={newPost.post_type} 
                                    onValueChange={(v) => setNewPost({ ...newPost, post_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(POST_TYPE_CONFIG).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <config.icon className="w-4 h-4" />
                                                    {config.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Visibility</label>
                                <Select 
                                    value={newPost.visibility} 
                                    onValueChange={(v) => setNewPost({ ...newPost, visibility: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <config.icon className="w-4 h-4" />
                                                    {config.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Department */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Department</label>
                            <Select 
                                value={newPost.department || 'general'} 
                                onValueChange={(v) => setNewPost({ ...newPost, department: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    {DEPARTMENTS.map(d => (
                                        <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Title</label>
                            <Input
                                value={newPost.title}
                                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                placeholder="Post title..."
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Content</label>
                            <Textarea
                                value={newPost.content}
                                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                placeholder="What would you like to share?"
                                rows={5}
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Tags</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    placeholder="Add tags..."
                                    className="flex-1"
                                />
                                <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                            </div>
                            {newPost.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {newPost.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="gap-1">
                                            #{tag}
                                            <X 
                                                className="w-3 h-3 cursor-pointer" 
                                                onClick={() => removeTag(tag)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Priority</label>
                            <Select 
                                value={newPost.priority} 
                                onValueChange={(v) => setNewPost({ ...newPost, priority: v })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreatePost}
                            disabled={submitting}
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Post
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
