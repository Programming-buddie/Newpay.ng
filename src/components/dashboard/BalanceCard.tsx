import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { Account } from '../../types';
import { formatNaira } from '../../utils/money';

interface BalanceCardProps {
  account: Account | null;
  isHidden: boolean;
  onToggleHidden: () => void;
  isLoading?: boolean;
}

export function BalanceCard({
  account,
  isHidden,
  onToggleHidden,
  isLoading = false,
}: BalanceCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAccount = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard permission unavailable
    }
  };

  if (isLoading && !account) {
    return (
      <div className="rounded-2xl bg-brand-900 p-6 sm:p-7 text-white animate-pulse">
        <div className="h-4 w-32 bg-white/15 rounded" />
        <div className="h-10 w-52 bg-white/20 rounded mt-4" />
        <div className="h-4 w-48 bg-white/15 rounded mt-6" />
      </div>
    );
  }

  return (
    <section
      aria-label="Wallet balance"
      className="rounded-2xl bg-brand-900 text-white p-6 sm:p-7 border border-brand-800 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brand-200 tracking-wide">
            Available balance
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p
              data-testid="wallet-balance"
              className="text-3xl sm:text-4xl font-display font-bold tracking-tight tabular-nums"
            >
              {isHidden
                ? '₦ ••••••'
                : account
                  ? formatNaira(account.balanceKobo)
                  : '₦0.00'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleHidden}
          aria-label={isHidden ? 'Show balance' : 'Hide balance'}
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-brand-100 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="hidden sm:inline">{isHidden ? 'Show' : 'Hide'}</span>
        </button>
      </div>

      {account && (
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-brand-100">
            <span className="font-medium text-white">{account.accountName}</span>
            <span aria-hidden="true" className="text-brand-200/60">·</span>
            <span>{account.bankName}</span>
            <span aria-hidden="true" className="text-brand-200/60">·</span>
            <span className="font-mono tabular-nums text-white">{account.accountNumber}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyAccount}
            aria-label="Copy account number"
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white inline-flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-brand-200" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy account no.</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
