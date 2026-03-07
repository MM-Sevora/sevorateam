import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Calendar,
  Kanban,
  BarChart3,
  QrCode,
  Settings,
  LogOut,
  Sparkles,
  Megaphone,
  Handshake
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/customers', icon: UserCircle, label: 'Customers' },
    { to: '/wedding-planner', icon: Calendar, label: 'Wedding Planner' },
    { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
    { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/partners', icon: Handshake, label: 'Partnerships' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/qr-codes', icon: QrCode, label: 'QR Codes' },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-heading text-primary tracking-tight">Sevora</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">CRM Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              end={item.to === '/'}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <Separator className="my-4" />

        <nav className="px-3">
          <NavLink
            to="/settings"
            data-testid="nav-settings"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </NavLink>
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-secondary flex items-center justify-center text-sm font-semibold text-primary">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <Button
          variant="outline"
          data-testid="logout-btn"
          className="w-full rounded-sm text-xs uppercase tracking-wider"
          onClick={handleLogout}
        >
          <LogOut className="w-3 h-3 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
