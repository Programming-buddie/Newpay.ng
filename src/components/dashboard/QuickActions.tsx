import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ReceiptText, User } from 'lucide-react';

const actions = [
  {
    to: '/send',
    label: 'Send Money',
    description: 'To any bank',
    icon: ArrowUpRight,
    primary: true,
  },
  {
    to: '/receive',
    label: 'Receive Money',
    description: 'Account & credit',
    icon: ArrowDownLeft,
    primary: false,
  },
  {
    to: '/transactions',
    label: 'History',
    description: 'All transactions',
    icon: ReceiptText,
    primary: false,
  },
  {
    to: '/profile',
    label: 'Account Details',
    description: 'Profile & details',
    icon: User,
    primary: false,
  },
];

export function QuickActions() {
  return (
    <section aria-label="Quick actions" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map(({ to, label, description, icon: Icon, primary }) => (
        <Link
          key={to}
          to={to}
          className={[
            'min-h-[76px] p-4 rounded-xl border transition-colors duration-150 flex flex-col justify-between gap-2.5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
            primary
              ? 'bg-brand-700 border-brand-700 text-white hover:bg-brand-800'
              : 'bg-surface border-line text-ink hover:bg-subtle',
          ].join(' ')}
        >
          <div className="flex items-center justify-between">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                primary ? 'bg-white/15 text-white' : 'bg-subtle text-brand-700'
              }`}
            >
              <Icon className="w-4 h-4" />
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{label}</p>
            <p
              className={`text-xs mt-0.5 line-clamp-1 ${
                primary ? 'text-brand-100' : 'text-muted'
              }`}
            >
              {description}
            </p>
          </div>
        </Link>
      ))}
    </section>
  );
}
