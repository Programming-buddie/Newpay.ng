import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Home, ReceiptText, User } from 'lucide-react';

const mobileTabs = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/send', label: 'Send', icon: ArrowUpRight },
  { to: '/receive', label: 'Receive', icon: ArrowDownLeft },
  { to: '/transactions', label: 'History', icon: ReceiptText },
  { to: '/profile', label: 'Profile', icon: User },
];

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line"
    >
      <div className="grid grid-cols-5 h-16 items-center">
        {mobileTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'min-h-[44px] h-full flex flex-col items-center justify-center gap-1 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600',
                isActive ? 'text-brand-700 font-semibold' : 'text-muted hover:text-ink',
              ].join(' ')
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-[11px] leading-none whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
