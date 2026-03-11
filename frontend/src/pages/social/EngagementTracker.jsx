import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import {
    Linkedin,
    Twitter,
    Instagram,
    Facebook,
    Youtube,
    Heart,
    MessageCircle,
    Share2,
    UserPlus,
    AtSign,
    TrendingUp,
    Activity,
    Bell,
    RefreshCw,
    Settings,
    Globe,
    ExternalLink,
    Zap,
    Clock,
    Loader2,
    Copy,
    Check,
    AlertCircle,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from 'recharts';

const PLATFORM_ICONS = {
    linkedin: Linkedin,
    twitter: Twitter,
    instagram: Instagram,
    facebook: Facebook,
    youtube: Youtube,
};

const PLATFORM_COLORS = {
    linkedin: '#0A66C2',
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    facebook: '#1877F2',
    youtube: '#FF0000',
};

const EVENT_TYPE_ICONS = {
    post_like: Heart,
    post_comment: MessageCircle,
    post_share: Share2,
    new_follower: UserPlus,
    unfollow: UserPlus,
    mention: AtSign,
};

const EVENT_TYPE_COLORS = {
    post_like: '#ef4444',
    post_comment: '#3b82f6',
    post_share: '#22c55e',
    new_follower: '#a855f7',
    mention: '#f59e0b',
};

export default function EngagementTracker() {
    const { api } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [events, setEvents] = useState([]);
    const [summary, setSummary] = useState(null);
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [simulating, setSimulating] = useState(null);
    const [copiedUrl, setCopiedUrl] = useState(null);

    useEffect(() => {
        fetchData();
    }, [period, selectedPlatform]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const platformFilter = selectedPlatform !== 'all' ? `&platform=${selectedPlatform}` : '';
            
            const [eventsRes, summaryRes, configsRes] = await Promise.all([
                api.get(`/social/webhooks/events?limit=30${platformFilter}`),
                api.get(`/social/webhooks/engagement/summary?period=${period}${platformFilter}`),
                api.get('/social/webhooks/config'),
            ]);

            setEvents(eventsRes.data.events || []);
            setSummary(summaryRes.data);
            setConfigs(configsRes.data.configs || []);
        } catch (error) {
            console.error('Failed to fetch engagement data:', error);
            toast.error('Failed to load engagement data');
        } finally {
            setLoading(false);
        }
    };

    const handleSimulateEvent = async (platform, eventType) => {
        setSimulating(`${platform}-${eventType}`);
        try {
            const response = await api.post(`/social/webhooks/test/${platform}?event_type=${eventType}`);
            toast.success(`Simulated ${eventType} on ${platform}`);
            fetchData();
        } catch (error) {
            toast.error('Simulation failed');
        } finally {
            setSimulating(null);
        }
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedUrl(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    const formatEventType = (type) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Prepare chart data
    const pieData = summary?.by_type ? Object.entries(summary.by_type).map(([name, value]) => ({
        name: formatEventType(name),
        value,
        color: EVENT_TYPE_COLORS[name] || '#666',
    })) : [];

    const platformBarData = summary?.by_platform ? Object.entries(summary.by_platform).map(([name, value]) => ({
        platform: name,
        events: value,
        color: PLATFORM_COLORS[name] || '#666',
    })) : [];

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                    <p className="text-gray-500">Loading engagement data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto" data-testid="engagement-tracker">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Engagement Tracker</h1>
                        <p className="text-gray-500 mt-1">
                            Real-time tracking of likes, comments, shares, and followers
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1d">Last 24h</SelectItem>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                                <SelectItem value="30d">Last 30 days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Platforms</SelectItem>
                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                <SelectItem value="twitter">Twitter/X</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="youtube">YouTube</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchData} className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-4 mt-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-rose-100">
                                    <Heart className="w-5 h-5 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary?.by_type?.post_like || 0}</p>
                                    <p className="text-xs text-gray-500">Likes</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <MessageCircle className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary?.by_type?.post_comment || 0}</p>
                                    <p className="text-xs text-gray-500">Comments</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-100">
                                    <Share2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary?.by_type?.post_share || 0}</p>
                                    <p className="text-xs text-gray-500">Shares</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100">
                                    <UserPlus className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary?.by_type?.new_follower || 0}</p>
                                    <p className="text-xs text-gray-500">New Followers</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <AtSign className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary?.by_type?.mention || 0}</p>
                                    <p className="text-xs text-gray-500">Mentions</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Structure Ready Notice */}
            <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-blue-800">Webhook Receiver Ready</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                The webhook endpoints are configured. When you connect your platform APIs, 
                                engagement events will be tracked here in real-time. Use the "Test" buttons 
                                to simulate events for development.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                    <TabsTrigger value="overview" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="events" className="gap-2">
                        <Activity className="w-4 h-4" />
                        Live Events
                    </TabsTrigger>
                    <TabsTrigger value="setup" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Webhook Setup
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Engagement by Type */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Engagement by Type</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                dataKey="value"
                                                label={({ name, value }) => `${name}: ${value}`}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[250px] flex items-center justify-center text-gray-400">
                                        No engagement data yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Engagement by Platform */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Engagement by Platform</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {platformBarData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={platformBarData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="platform" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="events" radius={[4, 4, 0, 0]}>
                                                {platformBarData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[250px] flex items-center justify-center text-gray-400">
                                        No platform data yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Trending Posts */}
                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base">Top Engaged Posts</CardTitle>
                                <CardDescription>Posts with the most engagement this period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {summary?.trending_posts?.length > 0 ? (
                                    <div className="space-y-3">
                                        {summary.trending_posts.map((post, idx) => {
                                            const PlatformIcon = PLATFORM_ICONS[post.platform] || Globe;
                                            return (
                                                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                                                    <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                                                    <PlatformIcon 
                                                        className="w-5 h-5" 
                                                        style={{ color: PLATFORM_COLORS[post.platform] }}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium truncate">{post._id}</p>
                                                        <p className="text-xs text-gray-500">{post.platform}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                                                        {post.total_engagement} events
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-gray-400">
                                        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No trending posts yet</p>
                                        <p className="text-sm mt-1">Engagement will appear here when events arrive</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Live Events Feed</CardTitle>
                                <CardDescription>Recent engagement events from all platforms</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {['linkedin', 'twitter', 'instagram'].map(platform => (
                                    <Button
                                        key={platform}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSimulateEvent(platform, 'post_like')}
                                        disabled={simulating !== null}
                                    >
                                        {simulating === `${platform}-post_like` ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Zap className="w-4 h-4 mr-1" />
                                        )}
                                        Test {platform}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {events.length > 0 ? (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {events.map(event => {
                                        const PlatformIcon = PLATFORM_ICONS[event.platform] || Globe;
                                        const EventIcon = EVENT_TYPE_ICONS[event.event_type] || Activity;
                                        
                                        return (
                                            <div 
                                                key={event.id}
                                                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                                            >
                                                <div 
                                                    className="p-2 rounded-lg"
                                                    style={{ backgroundColor: `${PLATFORM_COLORS[event.platform]}15` }}
                                                >
                                                    <PlatformIcon 
                                                        className="w-5 h-5"
                                                        style={{ color: PLATFORM_COLORS[event.platform] }}
                                                    />
                                                </div>
                                                <div 
                                                    className="p-1.5 rounded-full"
                                                    style={{ backgroundColor: `${EVENT_TYPE_COLORS[event.event_type]}20` }}
                                                >
                                                    <EventIcon 
                                                        className="w-4 h-4"
                                                        style={{ color: EVENT_TYPE_COLORS[event.event_type] }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">
                                                            {formatEventType(event.event_type)}
                                                        </span>
                                                        {event.actor?.name && (
                                                            <span className="text-sm text-gray-500">
                                                                by {event.actor.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {event.content && (
                                                        <p className="text-xs text-gray-500 truncate">{event.content}</p>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 whitespace-nowrap">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    {new Date(event.received_at).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-gray-400">
                                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No events yet</p>
                                    <p className="text-sm mt-1">Click "Test" buttons above to simulate events</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Setup Tab */}
                <TabsContent value="setup">
                    <div className="space-y-4">
                        {configs.map(config => {
                            const PlatformIcon = PLATFORM_ICONS[config.platform] || Globe;
                            const setupInfo = config.setup_instructions || {};
                            
                            return (
                                <Card key={config.platform}>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="p-2 rounded-lg"
                                                style={{ backgroundColor: `${PLATFORM_COLORS[config.platform]}15` }}
                                            >
                                                <PlatformIcon 
                                                    className="w-6 h-6"
                                                    style={{ color: PLATFORM_COLORS[config.platform] }}
                                                />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base capitalize">{config.platform} Webhooks</CardTitle>
                                                <CardDescription>
                                                    Events: {config.events_subscribed?.join(', ')}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Webhook URLs */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase">Verification URL</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <code className="flex-1 text-xs p-2 bg-gray-100 rounded overflow-hidden text-ellipsis">
                                                        {config.verify_url}
                                                    </code>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => copyToClipboard(config.verify_url, `verify-${config.platform}`)}
                                                    >
                                                        {copiedUrl === `verify-${config.platform}` ? (
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase">Events URL</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <code className="flex-1 text-xs p-2 bg-gray-100 rounded overflow-hidden text-ellipsis">
                                                        {config.events_url}
                                                    </code>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => copyToClipboard(config.events_url, `events-${config.platform}`)}
                                                    >
                                                        {copiedUrl === `events-${config.platform}` ? (
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Setup Steps */}
                                        {setupInfo.steps && (
                                            <div className="p-3 rounded-lg bg-gray-50">
                                                <h4 className="text-sm font-medium mb-2">Setup Instructions</h4>
                                                <ol className="text-sm text-gray-600 space-y-1">
                                                    {setupInfo.steps.map((step, idx) => (
                                                        <li key={idx}>{step}</li>
                                                    ))}
                                                </ol>
                                                {setupInfo.docs_url && (
                                                    <a 
                                                        href={setupInfo.docs_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                                                    >
                                                        View Documentation <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
