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
                <h1 className="text-2xl font-bold text-[#4A3728]">Social Media Dashboard</h1>
                <p className="text-[#5D4A3A] mt-1">Content creation and scheduling</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">Total Content</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.total_content || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center">
                                <PenTool className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">Scheduled</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.scheduled || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">Published</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.published || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-stone-600 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">Drafts</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.drafts || 0}</p>
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
                    <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-[#4A3728] font-semibold">Content Studio</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Create new content</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-pink-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/social/ai-tools">
                    <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-[#4A3728] font-semibold">AI Tools</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Generate captions & ideas</p>
                            </div>
                            <Sparkles className="w-5 h-5 text-rose-600 group-hover:rotate-12 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/social/autopilot">
                    <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-[#4A3728] font-semibold">Autopilot</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Automated posting</p>
                            </div>
                            <Zap className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Platform Distribution */}
            {stats?.by_platform && Object.keys(stats.by_platform).length > 0 && (
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-[#4A3728]">Content by Platform</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(stats.by_platform).map(([platform, count]) => (
                                <div key={platform} className="bg-[#F5EDE5] rounded-lg p-4">
                                    <p className="text-[#5D4A3A] text-sm capitalize">{platform}</p>
                                    <p className="text-2xl font-bold text-[#4A3728] mt-1">{count}</p>
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
