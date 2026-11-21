import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TransactionList } from '../components/dashboard/TransactionList';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { useAccount } from '../hooks/useAccount';
import { TransactionFilter, useTransactions } from '../hooks/useTransactions';
import { formatNaira } from '../utils/money';

const filterTabs: Array<{ id: TransactionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'debit', label: 'Money Sent' },
  { id: 'credit', label: 'Money Received' },
];

export function Transactions() {
  const { account } = useAccount();
  const { transactions, allTransactions, filter, setFilter, isLoading } = useTransactions();
  const navigate = useNavigate();

  return (
    <DashboardLayout
      title="Transactions"
      subtitle="Full ledger of your Naira transfers and credits"
      action={
        account ? (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <span>Balance:</span>
            <span className="font-mono font-semibold text-ink tabular-nums">
              {formatNaira(account.balanceKobo)}
            </span>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter transactions"
          className="inline-flex items-center gap-1 p-1 bg-subtle border border-line rounded-xl self-start"
        >
          {filterTabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={[
                  'min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                  active
                    ? 'bg-surface text-ink shadow-xs font-semibold'
                    : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted tabular-nums">
          Showing {transactions.length} of {allTransactions.length}{' '}
          {allTransactions.length === 1 ? 'transaction' : 'transactions'}
        </p>
      </div>

      <Card padding="none">
        <TransactionList
          transactions={transactions}
          isLoading={isLoading}
          emptyTitle={
            filter === 'all'
              ? 'No transactions yet'
              : filter === 'debit'
                ? 'No outgoing transfers yet'
                : 'No incoming payments yet'
          }
          emptyDescription={
            filter === 'debit'
              ? 'Transfers you send to supported banks will appear here.'
              : 'Credits and welcome bonus entries appear here.'
          }
          emptyActionLabel={filter === 'debit' ? 'Send Money' : 'Receive Money'}
          onEmptyAction={() => navigate(filter === 'debit' ? '/send' : '/receive')}
        />
      </Card>
    </DashboardLayout>
  );
}
