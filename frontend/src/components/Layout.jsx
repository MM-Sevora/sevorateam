import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
    LayoutDashboard, 
    Users, 
    Search, 
    Send, 
    Megaphone, 
    Wallet, 
    BarChart3, 
    FolderOpen,
    Sparkles,
    LogOut,
    Settings,
    Zap
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/ai-discovery', icon: Zap, label: 'AI Discovery', highlight: true },
    { to: '/discovery', icon: Search, label: 'Discovery' },
    { to: '/influencers', icon: Users, label: 'Influencer CRM' },
    { to: '/outreach', icon: Send, label: 'Outreach' },
    { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/budget', icon: Wallet, label: 'Budget' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/content', icon: FolderOpen, label: 'Content Library' },
    { to: '/ai', icon: Sparkles, label: 'AI Studio' },
];

export const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border flex flex-col bg-card">
                {/* Logo */}
                <div className="h-20 flex items-center px-6 border-b border-border">
                    <div>
                        <h1 className="font-serif text-xl tracking-tight">SEVORA</h1>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            Influencer Ops
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 py-6">
                    <nav className="space-y-1 px-3">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 ${
                                        isActive
                                            ? 'text-gold border-l-2 border-gold bg-gold/5 -ml-px'
                                            : item.highlight 
                                                ? 'text-gold hover:bg-gold/5'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`
                                }
                            >
                                <item.icon className={`w-4 h-4 ${item.highlight ? 'text-gold' : ''}`} strokeWidth={1.5} />
                                <span className="font-medium">{item.label}</span>
                                {item.highlight && (
                                    <span className="ml-auto text-[9px] bg-gold text-white px-1.5 py-0.5 rounded-full font-mono">
                                        NEW
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </ScrollArea>

                {/* User Section */}
                <div className="border-t border-border p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center">
                            <span className="font-serif text-sm text-gold">
                                {user?.name?.charAt(0) || 'U'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => navigate('/settings')}
                        >
                            <Settings className="w-3.5 h-3.5 mr-1.5" />
                            Settings
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            data-testid="logout-btn"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
