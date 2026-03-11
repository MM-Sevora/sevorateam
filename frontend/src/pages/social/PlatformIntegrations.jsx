import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
    Linkedin,
    Twitter,
    Instagram,
    Facebook,
    Youtube,
    Check,
    X,
    Link2,
    Unlink,
    Send,
    RefreshCw,
    AlertCircle,
    History,
    BarChart3,
    Settings,
    Zap,
    Globe,
    ImageIcon,
    Video,
    FileText,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';

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

const POST_TYPE_ICONS = {
    text: FileText,
    image: ImageIcon,
    video: Video,
    link: Link2,
};

export default function PlatformIntegrations() {
    const { api } = useAuth();
    const [activeTab, setActiveTab] = useState('connections');
    const [platforms, setPlatforms] = useState([]);
    const [connections, setConnections] = useState([]);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);

    // Publish dialog state
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [publishContent, setPublishContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [postType, setPostType] = useState('text');
    const [linkUrl, setLinkUrl] = useState('');

    // Test connection state
    const [testingPlatform, setTestingPlatform] = useState(null);

    useEffect(() => {
        // Check for OAuth callback success
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        if (connected) {
            toast.success(`Successfully connected ${connected}!`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [platformsRes, connectionsRes, historyRes, statsRes] = await Promise.all([
                api.get('/social/integrations/platforms'),
                api.get('/social/integrations/connections'),
                api.get('/social/integrations/history?limit=20'),
                api.get('/social/integrations/stats'),
            ]);

            setPlatforms(platformsRes.data.platforms || []);
            setConnections(connectionsRes.data.connections || []);
            setHistory(historyRes.data.history || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch integration data:', error);
            toast.error('Failed to load integration data');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform) => {
        try {
            const response = await api.post(`/social/integrations/connect/${platform}`);
            
            // Check if OAuth redirect is needed
            if (response.data.requires_oauth && response.data.auth_url) {
                // Redirect to OAuth provider
                window.location.href = response.data.auth_url;
                return;
            }
            
            toast.success(response.data.message);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to connect');
        }
    };

    const handleDisconnect = async (platform) => {
        try {
            await api.delete(`/social/integrations/disconnect/${platform}`);
            toast.success(`Disconnected from ${platform}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to disconnect');
        }
    };

    const handleTestConnection = async (platform) => {
        setTestingPlatform(platform);
        try {
            const response = await api.post(`/social/integrations/test/${platform}`);
            if (response.data.test_successful) {
                toast.success(`${response.data.platform_name} connection is working!`);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error('Connection test failed');
        } finally {
            setTestingPlatform(null);
        }
    };

    const handlePublish = async () => {
        if (!publishContent.trim()) {
            toast.error('Please enter content to publish');
            return;
        }
        if (selectedPlatforms.length === 0) {
            toast.error('Please select at least one platform');
            return;
        }

        setPublishing(true);
        try {
            const response = await api.post('/social/integrations/publish/multi', {
                platforms: selectedPlatforms,
                content: publishContent,
                media_urls: [],
                link_url: linkUrl || null,
                post_type: postType,
            });

            const { successful, failed, results } = response.data;
            
            if (successful > 0) {
                toast.success(`Published to ${successful} platform(s)`);
            }
            if (failed > 0) {
                toast.error(`Failed on ${failed} platform(s)`);
            }

            setShowPublishDialog(false);
            setPublishContent('');
            setSelectedPlatforms([]);
            setLinkUrl('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Publishing failed');
        } finally {
            setPublishing(false);
        }
    };

    const togglePlatformSelection = (platformId) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
    };

    const getConnectionStatus = (platformId) => {
        const conn = connections.find(c => c.platform === platformId);
        return conn?.status || 'disconnected';
    };

    const getConnectionInfo = (platformId) => {
        return connections.find(c => c.platform === platformId);
    };

    const connectedCount = connections.filter(c => c.status === 'connected').length;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                    <p className="text-gray-500">Loading integrations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto" data-testid="platform-integrations">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Platform Integrations</h1>
                        <p className="text-gray-500 mt-1">
                            Connect your social accounts and publish content directly
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchData}
                            className="gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => setShowPublishDialog(true)}
                            className="gap-2 bg-rose-600 hover:bg-rose-700"
                            disabled={connectedCount === 0}
                        >
                            <Send className="w-4 h-4" />
                            Publish Now
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-100">
                                    <Link2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{connectedCount}</p>
                                    <p className="text-xs text-gray-500">Connected</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{platforms.length}</p>
                                    <p className="text-xs text-gray-500">Available</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100">
                                    <Send className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats?.total_posts || 0}</p>
                                    <p className="text-xs text-gray-500">Total Posts</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats?.by_status?.published || 0}</p>
                                    <p className="text-xs text-gray-500">Published</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Structure Ready Notice */}
            <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-amber-800">Structure-Ready Mode</h3>
                            <p className="text-sm text-amber-700 mt-1">
                                Platform connections are simulated. When you're ready to go live, provide your API 
                                credentials for each platform and the system will publish directly to your accounts.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                    <TabsTrigger value="connections" className="gap-2">
                        <Link2 className="w-4 h-4" />
                        Connections
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" />
                        Publish History
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                {/* Connections Tab */}
                <TabsContent value="connections">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {platforms.map(platform => {
                            const PlatformIcon = PLATFORM_ICONS[platform.id] || Globe;
                            const status = getConnectionStatus(platform.id);
                            const connInfo = getConnectionInfo(platform.id);
                            const isConnected = status === 'connected';
                            const isTesting = testingPlatform === platform.id;

                            return (
                                <Card 
                                    key={platform.id}
                                    className={`relative overflow-hidden ${isConnected ? 'ring-2 ring-green-500/20' : ''}`}
                                    data-testid={`platform-card-${platform.id}`}
                                >
                                    {/* Color bar */}
                                    <div 
                                        className="absolute top-0 left-0 right-0 h-1"
                                        style={{ backgroundColor: platform.color }}
                                    />
                                    
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="p-2 rounded-lg"
                                                    style={{ backgroundColor: `${platform.color}15` }}
                                                >
                                                    <PlatformIcon 
                                                        className="w-6 h-6" 
                                                        style={{ color: platform.color }}
                                                    />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{platform.name}</CardTitle>
                                                    <Badge 
                                                        variant={isConnected ? 'default' : 'secondary'}
                                                        className={`mt-1 ${isConnected ? 'bg-green-100 text-green-700' : ''}`}
                                                    >
                                                        {isConnected ? (
                                                            <><Check className="w-3 h-3 mr-1" /> Connected</>
                                                        ) : (
                                                            'Not Connected'
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* Account Info */}
                                        {isConnected && connInfo?.account_name && (
                                            <div className="p-3 rounded-lg bg-gray-50">
                                                <p className="text-sm font-medium">{connInfo.account_name}</p>
                                                {connInfo.connected_at && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Connected {new Date(connInfo.connected_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Platform Capabilities */}
                                        <div className="flex flex-wrap gap-1">
                                            {platform.post_types?.slice(0, 4).map(type => (
                                                <Badge key={type} variant="outline" className="text-xs">
                                                    {type}
                                                </Badge>
                                            ))}
                                            <Badge variant="outline" className="text-xs">
                                                {platform.max_chars} chars
                                            </Badge>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {isConnected ? (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleTestConnection(platform.id)}
                                                        disabled={isTesting}
                                                    >
                                                        {isTesting ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Zap className="w-4 h-4 mr-1" />
                                                        )}
                                                        Test
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDisconnect(platform.id)}
                                                    >
                                                        <Unlink className="w-4 h-4 mr-1" />
                                                        Disconnect
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="w-full"
                                                    style={{ backgroundColor: platform.color }}
                                                    onClick={() => handleConnect(platform.id)}
                                                >
                                                    <Link2 className="w-4 h-4 mr-1" />
                                                    Connect {platform.name}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Publishing History</CardTitle>
                            <CardDescription>Recent posts published through the platform</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No publishing history yet</p>
                                    <p className="text-sm mt-1">Posts you publish will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map(item => {
                                        const PlatformIcon = PLATFORM_ICONS[item.platform] || Globe;
                                        const color = PLATFORM_COLORS[item.platform] || '#666';
                                        const isSuccess = item.status === 'published';

                                        return (
                                            <div 
                                                key={item.id}
                                                className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50"
                                            >
                                                <div 
                                                    className="p-2 rounded-lg"
                                                    style={{ backgroundColor: `${color}15` }}
                                                >
                                                    <PlatformIcon className="w-5 h-5" style={{ color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge 
                                                            variant={isSuccess ? 'default' : 'destructive'}
                                                            className={isSuccess ? 'bg-green-100 text-green-700' : ''}
                                                        >
                                                            {isSuccess ? (
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            ) : (
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                            )}
                                                            {item.status}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">
                                                            {item.created_at && new Date(item.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 line-clamp-2">
                                                        {item.content_preview}
                                                    </p>
                                                    {item.platform_url && (
                                                        <a 
                                                            href={item.platform_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                        >
                                                            View on {item.platform}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                    {item.error_message && (
                                                        <p className="text-xs text-red-600 mt-1">{item.error_message}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Integration Settings</CardTitle>
                            <CardDescription>Configure your platform integration preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                                <h3 className="font-medium text-blue-800 mb-2">API Credentials Required</h3>
                                <p className="text-sm text-blue-700">
                                    To enable real publishing, you'll need to set up developer accounts and 
                                    API credentials for each platform:
                                </p>
                                <ul className="mt-3 space-y-2 text-sm text-blue-700">
                                    <li className="flex items-center gap-2">
                                        <Linkedin className="w-4 h-4" />
                                        <span>LinkedIn: Create app at <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer" className="underline">developers.linkedin.com</a></span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Twitter className="w-4 h-4" />
                                        <span>Twitter/X: Apply at <a href="https://developer.twitter.com/" target="_blank" rel="noopener noreferrer" className="underline">developer.twitter.com</a></span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Instagram className="w-4 h-4" />
                                        <span>Instagram: Via <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline">Meta Business Suite</a></span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Facebook className="w-4 h-4" />
                                        <span>Facebook: Create app at <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Youtube className="w-4 h-4" />
                                        <span>YouTube: Enable API at <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></span>
                                    </li>
                                </ul>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h3 className="font-medium mb-3">Default Posting Settings</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-500">Default Post Type</label>
                                        <Select defaultValue="text">
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text Post</SelectItem>
                                                <SelectItem value="image">Image Post</SelectItem>
                                                <SelectItem value="link">Link Post</SelectItem>
                                                <SelectItem value="video">Video Post</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Auto-schedule Time</label>
                                        <Select defaultValue="now">
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="now">Publish Immediately</SelectItem>
                                                <SelectItem value="queue">Add to Queue</SelectItem>
                                                <SelectItem value="optimal">Optimal Time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Publish Dialog */}
            <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Publish to Platforms</DialogTitle>
                        <DialogDescription>
                            Create a post and publish it to multiple platforms at once
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Platform Selection */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Select Platforms</label>
                            <div className="flex flex-wrap gap-2">
                                {platforms
                                    .filter(p => getConnectionStatus(p.id) === 'connected')
                                    .map(platform => {
                                        const PlatformIcon = PLATFORM_ICONS[platform.id] || Globe;
                                        const isSelected = selectedPlatforms.includes(platform.id);
                                        
                                        return (
                                            <button
                                                key={platform.id}
                                                onClick={() => togglePlatformSelection(platform.id)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                                    isSelected 
                                                        ? 'border-2' 
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                style={isSelected ? { 
                                                    borderColor: platform.color,
                                                    backgroundColor: `${platform.color}10`
                                                } : {}}
                                            >
                                                <PlatformIcon 
                                                    className="w-4 h-4"
                                                    style={{ color: platform.color }}
                                                />
                                                <span className="text-sm">{platform.name}</span>
                                                {isSelected && (
                                                    <Check className="w-4 h-4" style={{ color: platform.color }} />
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>
                            {connections.filter(c => c.status === 'connected').length === 0 && (
                                <p className="text-sm text-amber-600 mt-2">
                                    No platforms connected. Connect at least one platform to publish.
                                </p>
                            )}
                        </div>

                        {/* Post Type */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Post Type</label>
                            <Select value={postType} onValueChange={setPostType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Text Post
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="link">
                                        <div className="flex items-center gap-2">
                                            <Link2 className="w-4 h-4" /> Link Post
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="image">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" /> Image Post
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Content */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Content</label>
                            <Textarea
                                value={publishContent}
                                onChange={(e) => setPublishContent(e.target.value)}
                                placeholder="What would you like to share?"
                                rows={4}
                                className="resize-none"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-gray-500">
                                    {publishContent.length} characters
                                </span>
                                {selectedPlatforms.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                        Min limit: {Math.min(...selectedPlatforms.map(p => 
                                            platforms.find(pl => pl.id === p)?.max_chars || 280
                                        ))} chars
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Link URL */}
                        {postType === 'link' && (
                            <div>
                                <label className="text-sm font-medium mb-2 block">Link URL</label>
                                <Input
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com/article"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePublish}
                            disabled={publishing || selectedPlatforms.length === 0 || !publishContent.trim()}
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            {publishing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Publishing...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Publish to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
