import React, { useEffect, useState } from 'react';
import { marketingAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, Target, MessageSquare, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MarketingDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await marketingAPI.getDashboard();
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch marketing stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8" data-testid="marketing-dashboard">
            <div>
                <h1 className="text-2xl font-bold text-white">Marketing Operations</h1>
                <p className="text-white/50 mt-1">Influencer management and campaign tracking</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Total Influencers</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats?.total_influencers || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Active Campaigns</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats?.active_campaigns || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                                <Target className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Pending Negotiations</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats?.pending_negotiations || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-fuchsia-500 flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#12121a] border-white/5">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm">Budget Remaining</p>
                                <p className="text-3xl font-bold text-white mt-1">₹{((stats?.budget_remaining || 0) / 100000).toFixed(1)}L</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/marketing/influencers">
                    <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 hover:border-violet-500/40 transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-semibold">Manage Influencers</h3>
                                <p className="text-white/50 text-sm mt-1">View and manage your influencer database</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-violet-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/marketing/campaigns">
                    <Card className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-semibold">View Campaigns</h3>
                                <p className="text-white/50 text-sm mt-1">Track and manage your campaigns</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/marketing/outreach">
                    <Card className="bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-semibold">Start Outreach</h3>
                                <p className="text-white/50 text-sm mt-1">Connect with influencers</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-fuchsia-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Status Distribution */}
            {stats?.status_distribution && Object.keys(stats.status_distribution).length > 0 && (
                <Card className="bg-[#12121a] border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Influencer Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(stats.status_distribution).map(([status, count]) => (
                                <div key={status} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                                    <span className="text-white/70 capitalize">{status}: </span>
                                    <span className="text-white font-semibold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default MarketingDashboard;
