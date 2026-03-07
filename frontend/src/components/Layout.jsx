import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    LayoutDashboard, Users, Target, MessageSquare, DollarSign, BarChart3,
    UserPlus, ShoppingBag, Calendar, QrCode, Building2, Settings,
    PenTool, Sparkles, Zap, Clock, Youtube, Image, LogOut, Menu, X,
    ChevronDown, ChevronRight, Briefcase
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
        color: 'from-violet-500 to-purple-600',
        bgColor: 'bg-violet-500/10',
        textColor: 'text-violet-400',
        routes: [
            { path: '/marketing', name: 'Dashboard', icon: LayoutDashboard },
            { path: '/marketing/influencers', name: 'Influencers', icon: Users },
            { path: '/marketing/campaigns', name: 'Campaigns', icon: Target },
            { path: '/marketing/outreach', name: 'Outreach', icon: MessageSquare },
            { path: '/marketing/negotiations', name: 'Negotiations', icon: DollarSign },
            { path: '/marketing/budget', name: 'Budget', icon: DollarSign },
            { path: '/marketing/ai-tools', name: 'AI Tools', icon: Sparkles },
            { path: '/marketing/analytics', name: 'Analytics', icon: BarChart3 },
        ]
    },
    sales: {
        name: 'Sales',
        icon: ShoppingBag,
        color: 'from-emerald-500 to-teal-600',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
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
        color: 'from-pink-500 to-rose-600',
        bgColor: 'bg-pink-500/10',
        textColor: 'text-pink-400',
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
    }
};

const ROLE_LABELS = {
    admin: 'Administrator',
    marketing_manager: 'Marketing Manager',
    sales_manager: 'Sales Manager',
    social_manager: 'Social Manager',
    stylist: 'Stylist',
    viewer: 'Viewer'
};

export const Layout = ({ children }) => {
    const { user, logout, hasAccessToDepartment } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedDepts, setExpandedDepts] = useState(['marketing', 'sales', 'social']);

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
        if (path.startsWith('/sales')) return 'sales';
        if (path.startsWith('/social')) return 'social';
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
        <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
            {/* Sidebar */}
            <aside 
                className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#12121a] border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                                    SEVORA
                                </h1>
                                <p className="text-[10px] text-white/40 -mt-1">TEAM PLATFORM</p>
                            </div>
                        )}
                    </Link>
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? <X className="w-4 h-4 text-white/40" /> : <Menu className="w-4 h-4 text-white/40" />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
                    {/* Home Dashboard */}
                    <Link
                        to="/"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            location.pathname === '/' 
                                ? 'bg-white/10 text-white' 
                                : 'text-white/60 hover:bg-white/5 hover:text-white'
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
                                            ? `${dept.bgColor} ${dept.textColor}` 
                                            : 'text-white/60 hover:bg-white/5 hover:text-white'
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
                                    <div className="ml-4 pl-4 border-l border-white/10 space-y-1">
                                        {dept.routes.map(route => {
                                            const RouteIcon = route.icon;
                                            const isActive = location.pathname === route.path;
                                            return (
                                                <Link
                                                    key={route.path}
                                                    to={route.path}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                                        isActive 
                                                            ? `bg-white/10 ${dept.textColor}` 
                                                            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
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
                <div className="p-4 border-t border-white/5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user?.avatar_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                {sidebarOpen && (
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                        <p className="text-xs text-white/40 truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[#1a1a24] border-white/10">
                            <DropdownMenuLabel className="text-white/60">
                                <div>
                                    <p className="font-medium text-white">{user?.name}</p>
                                    <p className="text-xs text-white/40">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                                onClick={handleLogout}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[#0a0a0f]">
                {children}
            </main>
        </div>
    );
};

export default Layout;
