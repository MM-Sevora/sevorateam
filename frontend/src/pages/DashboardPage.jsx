import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../lib/api';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
    Users, Target, MessageSquare, UserPlus, ShoppingBag, PenTool, TrendingUp, Clock,
    DollarSign, Receipt, FileText, CheckCircle, AlertCircle, BarChart3, 
    Briefcase, UserCheck, Calendar, ClipboardList, Settings, Shield, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';

const StatCard = ({ title, value, icon: Icon, color, link }) => (
    <Link to={link}>
        <Card className="bg-white border-[#E8D5C4] hover:border-[#D4BBA6] hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[#5D4A3A] text-sm">{title}</p>
                        <p className="text-3xl font-bold text-[#4A3728] mt-1">{value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-[#4A3728]" />
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
    const { user, hasAccessToDepartment, hasModuleAccess } = useAuth();
    const [stats, setStats] = useState(null);
    const [hrStats, setHrStats] = useState(null);
    const [expenseStats, setExpenseStats] = useState(null);
    const [adminStats, setAdminStats] = useState(null);
    const [taskStats, setTaskStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user has specific role
    const userRole = user?.role || '';
    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    const isHR = ['hr_admin', 'hr_employee'].includes(userRole) || hasModuleAccess?.('hr');
    const isFinance = ['finance_admin', 'finance_employee'].includes(userRole) || hasModuleAccess?.('expense');
    const isManager = userRole.includes('manager') || user?.can_manage_users;

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch base stats
                const response = await dashboardAPI.getUnified();
                setStats(response.data);

                // Fetch HR stats if user has access
                if (isHR || isAdmin) {
                    try {
                        const hrRes = await api.get('/hr/v2/dashboard-stats');
                        setHrStats(hrRes.data);
                    } catch (e) { console.log('HR stats not available'); }
                }

                // Fetch expense stats if user has access
                if (isFinance || isAdmin) {
                    try {
                        const expRes = await api.get('/expense/claims/stats');
                        setExpenseStats(expRes.data);
                    } catch (e) { console.log('Expense stats not available'); }
                }

                // Fetch admin stats if admin
                if (isAdmin) {
                    try {
                        const adminRes = await api.get('/admin/users');
                        setAdminStats({ 
                            total_users: adminRes.data?.length || 0,
                            active_users: adminRes.data?.filter(u => u.status === 'active').length || 0
                        });
                    } catch (e) { console.log('Admin stats not available'); }
                }

                // Fetch task stats for managers
                if (isManager || isAdmin) {
                    try {
                        const taskRes = await api.get('/tasks?limit=100');
                        const tasks = taskRes.data || [];
                        setTaskStats({
                            total: tasks.length,
                            pending: tasks.filter(t => t.status === 'pending').length,
                            in_progress: tasks.filter(t => t.status === 'in_progress').length,
                            completed: tasks.filter(t => t.status === 'completed').length
                        });
                    } catch (e) { console.log('Task stats not available'); }
                }

            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [isHR, isFinance, isAdmin, isManager]);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const marketingStats = stats?.stats?.marketing || {};
    const salesStats = stats?.stats?.sales || {};
    const socialStats = stats?.stats?.social || {};

    return (
        <div className="p-8 space-y-8" data-testid="dashboard-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#4A3728]">
                        Welcome back, {user?.name?.split(' ')[0]}
                    </h1>
                    <p className="text-[#5D4A3A] mt-1">Here's what's happening across your teams</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                </div>
            </div>

            {/* Admin Overview Section - Only for admins */}
            {isAdmin && adminStats && (
                <DepartmentSection title="System Overview" color="text-purple-800">
                    <StatCard 
                        title="Total Users" 
                        value={adminStats.total_users || 0}
                        icon={Users}
                        color="bg-purple-600"
                        link="/admin/users"
                    />
                    <StatCard 
                        title="Active Users" 
                        value={adminStats.active_users || 0}
                        icon={UserCheck}
                        color="bg-purple-500"
                        link="/admin/users"
                    />
                    <StatCard 
                        title="Roles" 
                        value={16}
                        icon={Shield}
                        color="bg-purple-700"
                        link="/admin/roles"
                    />
                </DepartmentSection>
            )}

            {/* Task Overview - For Managers and Admins */}
            {(isManager || isAdmin) && taskStats && (
                <DepartmentSection title="Task Overview" color="text-indigo-800">
                    <StatCard 
                        title="Total Tasks" 
                        value={taskStats.total || 0}
                        icon={ClipboardList}
                        color="bg-indigo-600"
                        link="/projects/my-tasks"
                    />
                    <StatCard 
                        title="In Progress" 
                        value={taskStats.in_progress || 0}
                        icon={Activity}
                        color="bg-indigo-500"
                        link="/projects/my-tasks"
                    />
                    <StatCard 
                        title="Completed" 
                        value={taskStats.completed || 0}
                        icon={CheckCircle}
                        color="bg-green-600"
                        link="/projects/my-tasks"
                    />
                </DepartmentSection>
            )}

            {/* HR Section - Only for HR roles */}
            {(isHR || isAdmin) && (
                <DepartmentSection title="HR & People" color="text-teal-800">
                    <StatCard 
                        title="Total Employees" 
                        value={hrStats?.total_employees || 0}
                        icon={Briefcase}
                        color="bg-teal-600"
                        link="/hr/employees"
                    />
                    <StatCard 
                        title="Active Employees" 
                        value={hrStats?.active_employees || 0}
                        icon={UserCheck}
                        color="bg-teal-500"
                        link="/hr/employees"
                    />
                    <StatCard 
                        title="On Leave" 
                        value={hrStats?.on_leave || 0}
                        icon={Calendar}
                        color="bg-teal-700"
                        link="/hr/leaves"
                    />
                </DepartmentSection>
            )}

            {/* Finance/Expense Section - Only for Finance roles */}
            {(isFinance || isAdmin) && (
                <DepartmentSection title="Finance & Expenses" color="text-emerald-800">
                    <StatCard 
                        title="Pending Claims" 
                        value={expenseStats?.pending || 0}
                        icon={Receipt}
                        color="bg-emerald-600"
                        link="/hr/expenses"
                    />
                    <StatCard 
                        title="Approved This Month" 
                        value={expenseStats?.approved || 0}
                        icon={CheckCircle}
                        color="bg-emerald-500"
                        link="/hr/expenses"
                    />
                    <StatCard 
                        title="Total Amount" 
                        value={`₹${((expenseStats?.total_amount || 0) / 1000).toFixed(0)}K`}
                        icon={DollarSign}
                        color="bg-emerald-700"
                        link="/hr/expenses"
                    />
                </DepartmentSection>
            )}

            {/* Marketing Ops Section */}
            {hasAccessToDepartment('marketing') && (
                <DepartmentSection title="Marketing Ops" color="text-amber-800">
                    <StatCard 
                        title="Influencers" 
                        value={marketingStats.influencers || 0}
                        icon={Users}
                        color="bg-amber-700"
                        link="/marketing/influencers"
                    />
                    <StatCard 
                        title="Active Campaigns" 
                        value={marketingStats.campaigns || 0}
                        icon={Target}
                        color="bg-amber-600"
                        link="/marketing/campaigns"
                    />
                    <StatCard 
                        title="Pending Negotiations" 
                        value={marketingStats.negotiations || 0}
                        icon={MessageSquare}
                        color="bg-amber-500"
                        link="/marketing/negotiations"
                    />
                </DepartmentSection>
            )}

            {/* Sales Section */}
            {hasAccessToDepartment('sales') && (
                <DepartmentSection title="Sales" color="text-stone-700">
                    <StatCard 
                        title="Total Leads" 
                        value={salesStats.leads || 0}
                        icon={UserPlus}
                        color="bg-stone-600"
                        link="/sales/leads"
                    />
                    <StatCard 
                        title="Customers" 
                        value={salesStats.customers || 0}
                        icon={ShoppingBag}
                        color="bg-stone-500"
                        link="/sales/customers"
                    />
                    <StatCard 
                        title="New Today" 
                        value={salesStats.new_leads_today || 0}
                        icon={TrendingUp}
                        color="bg-stone-700"
                        link="/sales/leads"
                    />
                </DepartmentSection>
            )}

            {/* Social Section */}
            {hasAccessToDepartment('social') && (
                <DepartmentSection title="Social Media" color="text-rose-700">
                    <StatCard 
                        title="Total Content" 
                        value={socialStats.content || 0}
                        icon={PenTool}
                        color="bg-rose-600"
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
                        color="bg-rose-700"
                        link="/social/analytics"
                    />
                </DepartmentSection>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hasAccessToDepartment('marketing') && (
                    <Link to="/marketing/influencers">
                        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6">
                                <h3 className="text-[#4A3728] font-semibold">Add Influencer</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Discover and add new influencers</p>
                            </CardContent>
                        </Card>
                    </Link>
                )}
                {hasAccessToDepartment('sales') && (
                    <Link to="/sales/leads">
                        <Card className="bg-gradient-to-br from-stone-50 to-gray-100 border-stone-200 hover:border-stone-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6">
                                <h3 className="text-[#4A3728] font-semibold">New Lead</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Capture a new sales lead</p>
                            </CardContent>
                        </Card>
                    </Link>
                )}
                {hasAccessToDepartment('social') && (
                    <Link to="/social/studio">
                        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6">
                                <h3 className="text-[#4A3728] font-semibold">Create Content</h3>
                                <p className="text-[#5D4A3A] text-sm mt-1">Generate new social content</p>
                            </CardContent>
                        </Card>
                    </Link>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
