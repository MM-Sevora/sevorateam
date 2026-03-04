import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { LayoutDashboard, Users, Send, Handshake, Megaphone, Wallet, BarChart3, Sparkles, LogOut } from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/influencers', icon: Users, label: 'Influencers' },
    { to: '/outreach', icon: Send, label: 'Outreach' },
    { to: '/negotiations', icon: Handshake, label: 'Negotiations' },
    { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/budget', icon: Wallet, label: 'Budget' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/ai', icon: Sparkles, label: 'AI Tools' },
];

export const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="w-56 border-r border-border flex flex-col bg-card">
                <div className="h-14 flex items-center px-4 border-b border-border">
                    <h1 className="font-serif text-lg">SEVORA</h1>
                    <span className="ml-2 text-[9px] font-mono uppercase text-muted-foreground">Ops</span>
                </div>
                <nav className="flex-1 py-4 px-2 space-y-0.5">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 text-sm rounded-sm transition-all ${
                                    isActive ? 'text-gold bg-gold/5 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`
                            }
                        >
                            <item.icon className="w-4 h-4" strokeWidth={1.5} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="border-t border-border p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center">
                                <span className="text-xs font-serif text-gold">{user?.name?.charAt(0)}</span>
                            </div>
                            <span className="text-xs truncate max-w-[100px]">{user?.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { logout(); navigate('/login'); }}>
                            <LogOut className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
};
