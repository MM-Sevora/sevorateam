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
                <h1 className="text-2xl font-bold text-gray-900">Marketing Operations</h1>
                <p className="text-gray-500 mt-1">Influencer management and campaign tracking</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">Total Influencers</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total_influencers || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">Active Campaigns</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.active_campaigns || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                                <Target className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">Pending Negotiations</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.pending_negotiations || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-fuchsia-500 flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">Budget Remaining</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">₹{((stats?.budget_remaining || 0) / 100000).toFixed(1)}L</p>
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
                    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-gray-900 font-semibold">Manage Influencers</h3>
                                <p className="text-gray-500 text-sm mt-1">View and manage your influencer database</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-violet-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/marketing/campaigns">
                    <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-gray-900 font-semibold">View Campaigns</h3>
                                <p className="text-gray-500 text-sm mt-1">Track and manage your campaigns</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/marketing/outreach">
                    <Card className="bg-gradient-to-br from-fuchsia-50 to-pink-50 border-fuchsia-200 hover:border-fuchsia-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-gray-900 font-semibold">Start Outreach</h3>
                                <p className="text-gray-500 text-sm mt-1">Connect with influencers</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-fuchsia-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Status Distribution */}
            {stats?.status_distribution && Object.keys(stats.status_distribution).length > 0 && (
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Influencer Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(stats.status_distribution).map(([status, count]) => (
                                <div key={status} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                                    <span className="text-gray-600 capitalize">{status}: </span>
                                    <span className="text-gray-900 font-semibold">{count}</span>
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
