import React, { useEffect, useState } from 'react';
import { socialAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PenTool, Clock, TrendingUp, Image, ArrowUpRight, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SocialDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await socialAPI.getDashboard();
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch social stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8" data-testid="social-dashboard">
            <div>
                <h1 className="text-2xl font-bold text-white">Social Media Dashboard</h1>
                <p className="text-white/50 mt-1">Content creation and scheduling</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Total Content</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats?.total_content || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center">
                                <PenTool className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Scheduled</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats?.scheduled || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Published</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats?.published || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Drafts</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats?.drafts || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                                <Image className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/social/studio">
                    <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/40 transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-semibold">Content Studio</h3>
                                <p className="text-white/50 text-sm mt-1">Create new content</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-pink-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/social/ai-tools">
                    <Card className="bg-gradient-to-br from-rose-500/10 to-red-500/10 border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-semibold">AI Tools</h3>
                                <p className="text-white/50 text-sm mt-1">Generate captions & ideas</p>
                            </div>
                            <Sparkles className="w-5 h-5 text-rose-400 group-hover:rotate-12 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/social/autopilot">
                    <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-semibold">Autopilot</h3>
                                <p className="text-white/50 text-sm mt-1">Automated posting</p>
                            </div>
                            <Zap className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Platform Distribution */}
            {stats?.by_platform && Object.keys(stats.by_platform).length > 0 && (
                <Card className="bg-[#12121a] border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Content by Platform</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(stats.by_platform).map(([platform, count]) => (
                                <div key={platform} className="bg-white/5 rounded-lg p-4">
                                    <p className="text-white/50 text-sm capitalize">{platform}</p>
                                    <p className="text-2xl font-bold text-white mt-1">{count}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SocialDashboard;
