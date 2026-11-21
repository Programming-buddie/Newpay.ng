import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Home,
  LogOut,
  ReceiptText,
  Settings,
  User,
} from 'lucide-react';
import { ENV } from '../../config/env';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { BrandLogo } from './BrandLogo';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/send', label: 'Send Money', icon: ArrowUpRight },
  { to: '/receive', label: 'Receive Money', icon: ArrowDownLeft },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    showToast({ type: 'info', title: 'Signed out', message: 'You have been signed out safely.' });
    navigate('/signin');
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-surface border-r border-line z-30">
      <div className="h-16 px-6 flex items-center gap-2.5 border-b border-line">
        <NavLink
          to="/dashboard"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded-lg"
        >
          <BrandLogo />
        </NavLink>
        {ENV.USE_MOCK_API && (
          <span className="px-2 py-0.5 rounded-full bg-subtle border border-line text-[11px] font-medium text-muted leading-none">
            Demo
          </span>
        )}
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                isActive
                  ? 'bg-brand-50 text-brand-800 font-semibold'
                  : 'text-muted hover:text-ink hover:bg-subtle',
              ].join(' ')
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-line space-y-3">
        {user && (
          <div className="px-2">
            <p className="text-sm font-semibold text-ink truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-medium text-muted hover:text-debit hover:bg-debit-bg/60 flex items-center gap-2.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
