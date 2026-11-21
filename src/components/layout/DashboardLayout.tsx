import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { ENV } from '../../config/env';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ title, subtitle, action, children }: DashboardLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    showToast({ type: 'info', title: 'Signed out' });
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Compact sticky top header (52px mobile, 64px desktop) */}
        <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur-md border-b border-line">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between gap-4">
            <div className="min-w-0 flex items-center gap-2">
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-ink truncate">{title}</h1>
                {subtitle && (
                  <p className="hidden sm:block text-xs text-muted truncate">{subtitle}</p>
                )}
              </div>
              {ENV.USE_MOCK_API && (
                <span className="lg:hidden px-2 py-0.5 rounded-full bg-subtle border border-line text-[11px] font-medium text-muted leading-none shrink-0">
                  Demo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {action}

              <Link
                to="/settings"
                aria-label="Settings"
                className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <Settings className="w-5 h-5" />
              </Link>

              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-surface border border-line hover:bg-subtle flex items-center gap-2.5 text-sm font-medium text-ink transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <span className="w-6 h-6 rounded-lg bg-brand-700 text-white text-xs font-bold flex items-center justify-center">
                    {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                  <span className="whitespace-nowrap">{user?.firstName ?? 'Account'}</span>
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 mt-1.5 w-48 bg-surface border border-line rounded-xl shadow-lg py-1 z-20"
                    >
                      <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3.5 py-2.5 text-sm text-ink hover:bg-subtle"
                      >
                        Profile & Account
                      </Link>
                      <Link
                        to="/settings"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block px-3.5 py-2.5 text-sm text-ink hover:bg-subtle"
                      >
                        Settings
                      </Link>
                      <div className="my-1 border-t border-line" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full text-left px-3.5 py-2.5 text-sm text-debit hover:bg-debit-bg/60 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-24 lg:pb-12 space-y-6">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
