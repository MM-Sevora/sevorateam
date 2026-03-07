import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationsDropdown, OnlineUsersIndicator } from './Notifications';
import { 
    LayoutDashboard, Users, Target, MessageSquare, DollarSign, BarChart3,
    UserPlus, ShoppingBag, Calendar, QrCode, Building2, Settings,
    PenTool, Sparkles, Zap, Clock, Youtube, Image, LogOut, Menu, X,
    ChevronDown, ChevronRight, Briefcase, Mail
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

const DEPARTMENT_CONFIG = {
    marketing: {
        name: 'Marketing Ops',
        icon: Target,
        color: 'from-amber-700 to-amber-800',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-800',
        routes: [
            { path: '/marketing', name: 'Dashboard', icon: LayoutDashboard },
            { path: '/marketing/influencers', name: 'Influencers', icon: Users },
            { path: '/marketing/pr', name: 'Digital PR', icon: MessageSquare },
            { path: '/marketing/events', name: 'Events & Exhibition', icon: Calendar },
            { path: '/marketing/campaigns', name: 'Campaigns', icon: Target },
            { path: '/marketing/calendar', name: 'Calendar', icon: Calendar },
            { path: '/marketing/contacts', name: 'Contacts Hub', icon: Users },
            { path: '/marketing/assets', name: 'Content & Assets', icon: Image },
            { path: '/marketing/budget', name: 'Budget & Payments', icon: DollarSign },
            { path: '/marketing/ai-tools', name: 'AI Tools', icon: Sparkles },
            { path: '/marketing/analytics', name: 'Analytics', icon: BarChart3 },
        ]
    },
    mail: {
        name: 'Mail',
        icon: Mail,
        color: 'from-blue-600 to-blue-700',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        routes: [
            { path: '/mail/inbox', name: 'Inbox', icon: Mail },
        ]
    },
    sales: {
        name: 'Sales',
        icon: ShoppingBag,
        color: 'from-stone-600 to-stone-700',
        bgColor: 'bg-stone-50',
        textColor: 'text-stone-700',
        routes: [
            { path: '/sales', name: 'Dashboard', icon: LayoutDashboard },
            { path: '/sales/leads', name: 'Leads', icon: UserPlus },
            { path: '/sales/customers', name: 'Customers', icon: Users },
            { path: '/sales/pipeline', name: 'Pipeline', icon: Target },
            { path: '/sales/wedding-planner', name: 'Wedding Planner', icon: Calendar },
            { path: '/sales/qrcodes', name: 'QR Codes', icon: QrCode },
            { path: '/sales/partners', name: 'Partners', icon: Building2 },
            { path: '/sales/analytics', name: 'Analytics', icon: BarChart3 },
        ]
    },
    social: {
        name: 'Social',
        icon: PenTool,
        color: 'from-rose-600 to-rose-700',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        routes: [
            { path: '/social', name: 'Dashboard', icon: LayoutDashboard },
            { path: '/social/studio', name: 'Content Studio', icon: PenTool },
            { path: '/social/ai-tools', name: 'AI Tools', icon: Sparkles },
            { path: '/social/autopilot', name: 'Autopilot', icon: Zap },
            { path: '/social/posts', name: 'Posts & Schedule', icon: Clock },
            { path: '/social/library', name: 'Content Library', icon: Image },
            { path: '/social/youtube', name: 'YouTube', icon: Youtube },
            { path: '/social/avatar', name: 'Avatar', icon: Users },
            { path: '/social/analytics', name: 'Analytics', icon: BarChart3 },
        ]
    },
    admin: {
        name: 'Administration',
        icon: Settings,
        color: 'from-slate-600 to-slate-700',
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-700',
        routes: [
            { path: '/admin/users', name: 'User Management', icon: Users },
            { path: '/admin/permissions', name: 'Permissions', icon: Settings },
        ]
    }
};

const ROLE_LABELS = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    marketing_manager: 'Marketing Manager',
    sales_manager: 'Sales Manager',
    social_manager: 'Social Manager',
    viewer: 'Viewer'
};

export const Layout = ({ children }) => {
    const { user, logout, hasAccessToDepartment } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedDepts, setExpandedDepts] = useState(['marketing', 'mail', 'sales', 'social', 'admin']);

    const toggleDepartment = (dept) => {
        setExpandedDepts(prev => 
            prev.includes(dept) 
                ? prev.filter(d => d !== dept)
                : [...prev, dept]
        );
    };

    const getCurrentDepartment = () => {
        const path = location.pathname;
        if (path.startsWith('/marketing')) return 'marketing';
        if (path.startsWith('/mail')) return 'mail';
        if (path.startsWith('/sales')) return 'sales';
        if (path.startsWith('/social')) return 'social';
        if (path.startsWith('/admin')) return 'admin';
        return null;
    };

    const accessibleDepartments = Object.keys(DEPARTMENT_CONFIG).filter(dept => 
        hasAccessToDepartment(dept)
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
            {/* Sidebar */}
            <aside 
                className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#F5EDE5] border-r border-[#D4BBA6] flex flex-col transition-all duration-300 ease-in-out`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-[#D4BBA6]">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#4A3728] flex items-center justify-center shadow-md">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <h1 className="text-lg font-bold text-[#4A3728]">
                                    SEVORA
                                </h1>
                                <p className="text-[10px] text-[#5D4A3A] -mt-1">TEAM PLATFORM</p>
                            </div>
                        )}
                    </Link>
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-[#E8D5C4] rounded-lg transition-colors"
                    >
                        {sidebarOpen ? <X className="w-4 h-4 text-[#4A3728]" /> : <Menu className="w-4 h-4 text-[#4A3728]" />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
                    {/* Home Dashboard */}
                    <Link
                        to="/"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            location.pathname === '/' 
                                ? 'bg-[#4A3728] text-white font-medium shadow-sm' 
                                : 'text-[#4A3728] hover:bg-[#E8D5C4]'
                        }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        {sidebarOpen && <span className="text-sm font-medium">Overview</span>}
                    </Link>

                    {/* Department Sections */}
                    {accessibleDepartments.map(deptKey => {
                        const dept = DEPARTMENT_CONFIG[deptKey];
                        const isExpanded = expandedDepts.includes(deptKey);
                        const isCurrentDept = getCurrentDepartment() === deptKey;
                        const DeptIcon = dept.icon;

                        return (
                            <div key={deptKey} className="space-y-1">
                                <button
                                    onClick={() => toggleDepartment(deptKey)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                                        isCurrentDept 
                                            ? `${dept.bgColor} ${dept.textColor} font-medium` 
                                            : 'text-[#4A3728] hover:bg-[#E8D5C4]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <DeptIcon className="w-5 h-5" />
                                        {sidebarOpen && (
                                            <span className="text-sm font-semibold">{dept.name}</span>
                                        )}
                                    </div>
                                    {sidebarOpen && (
                                        isExpanded 
                                            ? <ChevronDown className="w-4 h-4" />
                                            : <ChevronRight className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Department Routes */}
                                {sidebarOpen && isExpanded && (
                                    <div className="ml-4 pl-4 border-l border-[#D4BBA6] space-y-1">
                                        {dept.routes.map(route => {
                                            const RouteIcon = route.icon;
                                            const isActive = location.pathname === route.path;
                                            return (
                                                <Link
                                                    key={route.path}
                                                    to={route.path}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                                        isActive 
                                                            ? `bg-[#E8D5C4] ${dept.textColor} font-medium` 
                                                            : 'text-[#5D4A3A] hover:bg-[#E8D5C4]/50'
                                                    }`}
                                                >
                                                    <RouteIcon className="w-4 h-4" />
                                                    <span>{route.name}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-[#D4BBA6]">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#E8D5C4] transition-colors">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user?.avatar_url} />
                                    <AvatarFallback className="bg-[#4A3728] text-white text-sm">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                {sidebarOpen && (
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-[#4A3728] truncate">{user?.name}</p>
                                        <p className="text-xs text-[#5D4A3A] truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white border-[#D4BBA6]">
                            <DropdownMenuLabel className="text-[#5D4A3A]">
                                <div>
                                    <p className="font-medium text-[#4A3728]">{user?.name}</p>
                                    <p className="text-xs text-[#5D4A3A]">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[#E8D5C4]" />
                            <DropdownMenuItem className="text-[#4A3728] hover:bg-[#F5EDE5] cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#E8D5C4]" />
                            <DropdownMenuItem 
                                onClick={handleLogout}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-white">
                {/* Top Header Bar */}
                <div className="h-14 border-b border-[#E8D5C4] bg-white flex items-center justify-between px-6 sticky top-0 z-10">
                    <OnlineUsersIndicator />
                    <div className="flex items-center gap-2">
                        <NotificationsDropdown />
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
};

export default Layout;
