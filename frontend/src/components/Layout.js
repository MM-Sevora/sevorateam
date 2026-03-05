import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Lightbulb, Wand2, FileText, Calendar,
  Link2, LogOut, Zap, Menu, X, ChevronLeft, Bot, BarChart3
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ideas', label: 'Content Ideas', icon: Lightbulb },
  { to: '/creator', label: 'Content Creator', icon: Wand2 },
  { to: '/avatar', label: 'AI Avatar', icon: Bot },
  { to: '/predictor', label: 'Predictor', icon: BarChart3 },
  { to: '/posts', label: 'Posts', icon: FileText },
  { to: '/scheduler', label: 'Calendar', icon: Calendar },
  { to: '/platforms', label: 'Platforms', icon: Link2 },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-violet flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="text-lg font-heading font-bold text-white whitespace-nowrap">SocialFlow AI</span>}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent-violet/10 text-accent-violet'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
          data-testid="logout-button"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface flex" data-testid="app-layout">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 z-40 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
        data-testid="sidebar"
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          data-testid="collapse-sidebar-button"
        >
          <ChevronLeft className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-64 bg-zinc-950 border-r border-white/5 z-50 transform transition-transform duration-300 flex flex-col overflow-y-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="mobile-sidebar"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-violet flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-white">SocialFlow AI</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400" data-testid="close-mobile-menu">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-accent-violet/10 text-accent-violet' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`
              }
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between" data-testid="topbar">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-zinc-400"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-violet/20 flex items-center justify-center">
              <span className="text-sm font-bold text-accent-violet">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
