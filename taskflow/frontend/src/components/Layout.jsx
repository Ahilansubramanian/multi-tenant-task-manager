import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CheckSquare, Users, LogOut,
  Zap, ChevronRight, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/members', icon: Users, label: 'Members', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-surface-950">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-surface-900 border-r border-surface-800">
        {/* Logo */}
        <div className="p-6 border-b border-surface-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight">TaskFlow</span>
          </div>
          <div className="mt-3 px-3 py-1.5 bg-surface-800 rounded-lg">
            <p className="text-xs text-surface-400 font-medium truncate">{user?.org_name}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, adminOnly }) => {
            if (adminOnly && user?.role !== 'admin') return null;
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800'
                  }`
                }
              >
                <Icon size={16} />
                {label}
                <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-surface-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-800 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <div className="flex items-center gap-1">
                {user?.role === 'admin' && <Shield size={10} className="text-brand-400" />}
                <span className="text-xs text-surface-400 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
