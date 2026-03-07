import React, { useEffect, useState } from 'react';
import { salesAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { UserPlus, ShoppingBag, TrendingUp, Target, ArrowUpRight, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SalesDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await salesAPI.getDashboard();
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch sales stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8" data-testid="sales-dashboard">
            <div>
                <h1 className="text-2xl font-bold text-[#4A3728]">Sales Dashboard</h1>
                <p className="text-[#5D4A3A] mt-1">Lead management and customer tracking</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">Total Leads</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.total_leads || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-stone-600 flex items-center justify-center">
                                <UserPlus className="w-6 h-6 text-[#4A3728]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">Customers</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.total_customers || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-stone-500 flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-[#4A3728]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">New Today</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.leads_today || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-stone-700 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-[#4A3728]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[#5D4A3A] text-sm">Conversion Rate</p>
                                <p className="text-3xl font-bold text-[#4A3728] mt-1">{stats?.conversion_rate || 0}%</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-stone-500 flex items-center justify-center">
                                <Target className="w-6 h-6 text-[#4A3728]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/sales/leads">
                    <Card className="bg-gradient-to-br from-stone-50 to-gray-100 border-stone-200 hover:border-stone-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-[#4A3728] font-semibold">Manage Leads</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">View and manage your leads</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-stone-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/sales/pipeline">
                    <Card className="bg-gradient-to-br from-stone-50 to-gray-100 border-stone-200 hover:border-stone-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-[#4A3728] font-semibold">View Pipeline</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Track lead stages</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-stone-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>

                <Link to="/sales/qrcodes">
                    <Card className="bg-gradient-to-br from-stone-50 to-gray-100 border-stone-200 hover:border-stone-300 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-[#4A3728] font-semibold">QR Codes</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Generate lead capture QR codes</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-stone-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Lead Sources */}
            {stats?.leads_by_source && Object.keys(stats.leads_by_source).length > 0 && (
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-[#4A3728] flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Lead Sources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(stats.leads_by_source).map(([source, count]) => (
                                <div key={source} className="bg-[#F5EDE5] rounded-lg p-4">
                                    <p className="text-[#5D4A3A] text-sm">{source}</p>
                                    <p className="text-2xl font-bold text-[#4A3728] mt-1">{count}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pipeline Stages */}
            {stats?.leads_by_stage && Object.keys(stats.leads_by_stage).length > 0 && (
                <Card className="bg-white border-[#E8D5C4] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-[#4A3728]">Pipeline Stages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(stats.leads_by_stage).map(([stage, count]) => (
                                <div key={stage} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-stone-600" />
                                    <span className="text-[#5D4A3A]">{stage}: </span>
                                    <span className="text-[#4A3728] font-semibold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SalesDashboard;
