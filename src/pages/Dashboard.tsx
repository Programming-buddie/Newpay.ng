import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { BalanceCard } from '../components/dashboard/BalanceCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { TransactionList } from '../components/dashboard/TransactionList';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { useAccount } from '../hooks/useAccount';
import { useAuth } from '../hooks/useAuth';
import { getTimeGreeting } from '../utils/dates';

export function Dashboard() {
  const { user } = useAuth();
  const {
    account,
    transactions,
    isLoading,
    isBalanceHidden,
    toggleBalanceVisibility,
    activityNotice,
    clearActivityNotice,
  } = useAccount();
  const navigate = useNavigate();

  const greeting = `${getTimeGreeting()}, ${user?.firstName ?? 'there'}`;
  const recentTransactions = transactions.slice(0, 5);

  return (
    <DashboardLayout
      title={greeting}
      subtitle="Here is an overview of your NewPay Naira wallet"
    >
      {activityNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-credit-bg border border-emerald-200 text-xs sm:text-sm text-ink"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-credit shrink-0" />
            <span className="truncate sm:whitespace-normal font-medium">{activityNotice}</span>
          </div>
          <button
            type="button"
            onClick={clearActivityNotice}
            aria-label="Dismiss activity notice"
            className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-emerald-100 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <BalanceCard
        account={account}
        isHidden={isBalanceHidden}
        onToggleHidden={toggleBalanceVisibility}
        isLoading={isLoading}
      />

      <QuickActions />

      <Card padding="none">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Recent transactions</h2>
            <p className="text-xs text-muted mt-0.5">Latest 5 wallet entries</p>
          </div>
          <Link
            to="/transactions"
            className="text-sm font-medium text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <TransactionList
          transactions={recentTransactions}
          isLoading={isLoading}
          emptyTitle="No activity yet"
          emptyDescription="Send money or receive a payment to see your wallet ledger update."
          emptyActionLabel="Receive Money"
          onEmptyAction={() => navigate('/receive')}
        />
      </Card>
    </DashboardLayout>
  );
}
