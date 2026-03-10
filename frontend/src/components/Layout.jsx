import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationsDropdown, OnlineUsersIndicator } from './Notifications';
import HelpButton from './HelpButton';
import TourTrigger from './TourTrigger';
import GlobalSearch from './GlobalSearch';
import { 
    LayoutDashboard, Users, Target, MessageSquare, DollarSign, BarChart3,
    UserPlus, ShoppingBag, Calendar, QrCode, Building2, Settings,
    PenTool, Sparkles, Zap, Clock, Youtube, Image, LogOut, Menu, X,
    ChevronDown, ChevronRight, Briefcase, Mail, Check, Send, ListTodo, FolderKanban,
    HelpCircle, Award, Network, Shield, Flag, CalendarDays, RefreshCw, Plus
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

const DEPARTMENT_CONFIG = {
    goals: {
        name: 'Goals & Objectives',
        icon: Flag,
        color: 'from-indigo-600 to-indigo-700',
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        routes: [
            { path: '/goals', name: 'Dashboard', icon: BarChart3 },
            { path: '/goals/strategic', name: 'Strategic Goals', icon: Flag },
            { path: '/goals/objectives', name: 'Objectives', icon: Target },
            { path: '/goals/fiscal-years', name: 'Fiscal Years', icon: CalendarDays },
        ]
    },
    meetings: {
        name: 'Communication Hub',
        icon: CalendarDays,
        color: 'from-violet-600 to-violet-700',
        bgColor: 'bg-violet-50',
        textColor: 'text-violet-700',
        routes: [
            { path: '/meetings', name: 'Meetings', icon: CalendarDays },
            { path: '/meetings/new', name: 'Schedule Meeting', icon: Plus },
            { path: '/teams/calendar', name: 'Teams Calendar', icon: Calendar },
            { path: '/teams/chat', name: 'Teams Chat', icon: MessageSquare },
            { path: '/mail/inbox', name: 'Inbox', icon: Mail },
        ]
    },
    projects: {
        name: 'Project Management',
        icon: FolderKanban,
        color: 'from-rose-600 to-rose-700',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        routes: [
            { path: '/projects/manager', name: 'Manager Dashboard', icon: BarChart3 },
            { path: '/projects/my-tasks', name: 'My Tasks', icon: ListTodo },
            { path: '/projects', name: 'All Projects', icon: FolderKanban },
            { path: '/projects/recurring', name: 'Recurring Tasks', icon: RefreshCw },
        ]
    },
    marketing: {
        name: 'Marketing Ops',
        icon: Target,
        color: 'from-amber-700 to-amber-800',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-800',
        routes: [
            { path: '/marketing', name: 'Insights & Analytics', icon: BarChart3 },
            { path: '/marketing/influencers', name: 'Influencers', icon: Users },
            { path: '/marketing/publications', name: 'Publications', icon: Building2 },
            { path: '/marketing/campaigns', name: 'Campaign Hub', icon: Target },
            { path: '/marketing/pipeline', name: 'Pipeline', icon: Briefcase },
            { path: '/marketing/assets', name: 'Content & Assets', icon: Image },
            { path: '/marketing/budget', name: 'Budget Overview', icon: DollarSign },
            { path: '/marketing/ai-tools', name: 'AI Tools & Discovery', icon: Sparkles },
        ]
    },
    sales: {
        name: 'Sales & CRM',
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
        name: 'Social Media',
        icon: PenTool,
        color: 'from-rose-600 to-rose-700',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        routes: [
            { path: '/social', name: 'Dashboard & Analytics', icon: BarChart3 },
            { path: '/social/studio', name: 'Content Studio', icon: PenTool },
            { path: '/social/posts', name: 'Posts & Schedule', icon: Clock },
            { path: '/social/library', name: 'Content Library', icon: Image },
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
            { path: '/admin/employees', name: 'Employee Database', icon: Award },
            { path: '/admin/access-control', name: 'Permissions', icon: Shield },
            { path: '/admin/organization', name: 'Organization', icon: Building2 },
        ]
    },
    hr: {
        name: 'HR & Finance',
        icon: Briefcase,
        color: 'from-emerald-600 to-emerald-700',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        routes: [
            { path: '/hr/expenses', name: 'Expenses & Reimbursement', icon: DollarSign },
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
    const { user, logout, hasAccessToDepartment, api } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedDepts, setExpandedDepts] = useState(['goals', 'marketing', 'projects', 'mail', 'sales', 'social', 'admin', 'hr']);

    const toggleDepartment = (dept) => {
        setExpandedDepts(prev => 
            prev.includes(dept) 
                ? prev.filter(d => d !== dept)
                : [...prev, dept]
        );
    };

    const getCurrentDepartment = () => {
        const path = location.pathname;
        if (path.startsWith('/goals')) return 'goals';
        if (path.startsWith('/marketing')) return 'marketing';
        if (path.startsWith('/projects')) return 'projects';
        if (path.startsWith('/mail')) return 'mail';
        if (path.startsWith('/sales')) return 'sales';
        if (path.startsWith('/social')) return 'social';
        if (path.startsWith('/admin')) return 'admin';
        if (path.startsWith('/hr')) return 'hr';
        return null;
    };

    const accessibleDepartments = Object.keys(DEPARTMENT_CONFIG).filter(dept => 
        hasAccessToDepartment(dept)
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Settings state
    const [showSettings, setShowSettings] = useState(false);
    const [microsoftEmail, setMicrosoftEmail] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);
    const [microsoftConnected, setMicrosoftConnected] = useState(false);

    // Fetch email settings on mount
    useEffect(() => {
        const fetchEmailSettings = async () => {
            try {
                const response = await api.get('/marketing/v2/user/email-settings');
                setMicrosoftEmail(response.data.microsoft_email || '');
            } catch (error) {
                console.error('Failed to fetch email settings');
            }
        };
        
        const checkMicrosoftStatus = async () => {
            try {
                const response = await api.get('/marketing/v2/microsoft/status');
                setMicrosoftConnected(response.data.connected);
            } catch (error) {
                console.error('Failed to check Microsoft status');
            }
        };
        
        fetchEmailSettings();
        checkMicrosoftStatus();
    }, [api]);

    const handleSaveSettings = async () => {
        if (!microsoftEmail) {
            toast.error('Please enter your Outlook email');
            return;
        }
        setSavingSettings(true);
        try {
            await api.put(`/marketing/v2/user/email-settings?microsoft_email=${encodeURIComponent(microsoftEmail)}`);
            toast.success('Email settings saved!');
            setShowSettings(false);
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
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
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2" data-tour="sidebar">
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

                    {/* Settings Section */}
                    <div className="mt-4 pt-4 border-t border-[#D4BBA6]">
                        <Link
                            to="/admin/team"
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-2 ${
                                location.pathname === '/admin/team'
                                    ? 'bg-[#E8D5C4] text-[#4A3728] font-medium'
                                    : 'text-[#5D4A3A] hover:bg-[#E8D5C4]/50'
                            }`}
                        >
                            <Users className="w-5 h-5" />
                            {sidebarOpen && <span className="font-semibold">Team Dashboard</span>}
                        </Link>
                        <Link
                            to="/settings/automations"
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                                location.pathname.startsWith('/settings')
                                    ? 'bg-[#E8D5C4] text-[#4A3728] font-medium'
                                    : 'text-[#5D4A3A] hover:bg-[#E8D5C4]/50'
                            }`}
                        >
                            <Zap className="w-5 h-5" />
                            {sidebarOpen && <span className="font-semibold">Automations</span>}
                        </Link>
                    </div>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-[#D4BBA6]" data-tour="user-menu">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button 
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#E8D5C4] transition-colors"
                                data-tour="user-menu"
                            >
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
                            <DropdownMenuItem 
                                onClick={() => setShowSettings(true)}
                                className="text-[#4A3728] hover:bg-[#F5EDE5] cursor-pointer"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => navigate('/help')}
                                className="text-[#4A3728] hover:bg-[#F5EDE5] cursor-pointer"
                            >
                                <HelpCircle className="w-4 h-4 mr-2" />
                                Help & Support
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
                    <div className="flex items-center gap-4">
                        <OnlineUsersIndicator />
                        <GlobalSearch />
                    </div>
                    <div className="flex items-center gap-2" data-tour="notifications">
                        <NotificationsDropdown />
                    </div>
                </div>
                {children}
            </main>

            {/* Settings Dialog */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Settings
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Microsoft 365 Status */}
                        <div className="p-4 rounded-lg bg-gray-50 border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium">Microsoft 365</p>
                                        <p className="text-xs text-gray-500">For sending emails via Outlook</p>
                                    </div>
                                </div>
                                {microsoftConnected ? (
                                    <span className="flex items-center gap-1 text-green-600 text-sm">
                                        <Check className="w-4 h-4" /> Connected
                                    </span>
                                ) : (
                                    <span className="text-amber-600 text-sm">Not configured</span>
                                )}
                            </div>
                        </div>

                        {/* Outlook Email */}
                        <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">
                                YOUR OUTLOOK EMAIL
                            </Label>
                            <Input
                                type="email"
                                value={microsoftEmail}
                                onChange={(e) => setMicrosoftEmail(e.target.value)}
                                placeholder="your.email@company.com"
                                className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This email will be used to send outreach emails from the system
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" onClick={() => setShowSettings(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="bg-[#4A3728] hover:bg-[#3A2A1C] text-white"
                        >
                            {savingSettings ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Floating Help Button */}
            <HelpButton position="bottom-right" />
            
            {/* Guided Tour Trigger */}
            <TourTrigger currentModule={getCurrentDepartment() || 'dashboard'} />
        </div>
    );
};

export default Layout;
