import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Target, MessageSquare, UserPlus, ShoppingBag, PenTool, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, link }) => (
    <Link to={link}>
        <Card className="bg-white border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm">{title}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
    </Link>
);

const DepartmentSection = ({ title, color, children }) => (
    <div className="space-y-4">
        <h2 className={`text-lg font-semibold ${color}`}>{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {children}
        </div>
    </div>
);

export const DashboardPage = () => {
    const { user, hasAccessToDepartment } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await dashboardAPI.getUnified();
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const marketingStats = stats?.stats?.marketing || {};
    const salesStats = stats?.stats?.sales || {};
    const socialStats = stats?.stats?.social || {};

    return (
        <div className="p-8 space-y-8" data-testid="dashboard-page">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user?.name?.split(' ')[0]}
                </h1>
                <p className="text-gray-500 mt-1">Here's what's happening across your teams</p>
            </div>

            {/* Marketing Ops Section */}
            {hasAccessToDepartment('marketing') && (
                <DepartmentSection title="Marketing Ops" color="text-violet-600">
                    <StatCard 
                        title="Influencers" 
                        value={marketingStats.influencers || 0}
                        icon={Users}
                        color="bg-violet-500"
                        link="/marketing/influencers"
                    />
                    <StatCard 
                        title="Active Campaigns" 
                        value={marketingStats.campaigns || 0}
                        icon={Target}
                        color="bg-purple-500"
                        link="/marketing/campaigns"
                    />
                    <StatCard 
                        title="Pending Negotiations" 
                        value={marketingStats.negotiations || 0}
                        icon={MessageSquare}
                        color="bg-fuchsia-500"
                        link="/marketing/negotiations"
                    />
                </DepartmentSection>
            )}

            {/* Sales Section */}
            {hasAccessToDepartment('sales') && (
                <DepartmentSection title="Sales" color="text-emerald-600">
                    <StatCard 
                        title="Total Leads" 
                        value={salesStats.leads || 0}
                        icon={UserPlus}
                        color="bg-emerald-500"
                        link="/sales/leads"
                    />
                    <StatCard 
                        title="Customers" 
                        value={salesStats.customers || 0}
                        icon={ShoppingBag}
                        color="bg-teal-500"
                        link="/sales/customers"
                    />
                    <StatCard 
                        title="New Today" 
                        value={salesStats.new_leads_today || 0}
                        icon={TrendingUp}
                        color="bg-cyan-500"
                        link="/sales/leads"
                    />
                </DepartmentSection>
            )}

            {/* Social Section */}
            {hasAccessToDepartment('social') && (
                <DepartmentSection title="Social Media" color="text-pink-600">
                    <StatCard 
                        title="Total Content" 
                        value={socialStats.content || 0}
                        icon={PenTool}
                        color="bg-pink-500"
                        link="/social/studio"
                    />
                    <StatCard 
                        title="Scheduled" 
                        value={socialStats.scheduled || 0}
                        icon={Clock}
                        color="bg-rose-500"
                        link="/social/posts"
                    />
                    <StatCard 
                        title="Published" 
                        value={socialStats.published || 0}
                        icon={TrendingUp}
                        color="bg-red-500"
                        link="/social/analytics"
                    />
                </DepartmentSection>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hasAccessToDepartment('marketing') && (
                    <Link to="/marketing/influencers">
                        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6">
                                <h3 className="text-gray-900 font-semibold">Add Influencer</h3>
                                <p className="text-gray-500 text-sm mt-1">Discover and add new influencers</p>
                            </CardContent>
                        </Card>
                    </Link>
                )}
                {hasAccessToDepartment('sales') && (
                    <Link to="/sales/leads">
                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6">
                                <h3 className="text-gray-900 font-semibold">New Lead</h3>
                                <p className="text-gray-500 text-sm mt-1">Capture a new sales lead</p>
                            </CardContent>
                        </Card>
                    </Link>
                )}
                {hasAccessToDepartment('social') && (
                    <Link to="/social/studio">
                        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 hover:border-pink-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6">
                                <h3 className="text-gray-900 font-semibold">Create Content</h3>
                                <p className="text-gray-500 text-sm mt-1">Generate new social content</p>
                            </CardContent>
                        </Card>
                    </Link>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
