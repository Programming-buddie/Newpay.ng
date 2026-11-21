import React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction } from '../../types';
import { formatShortTime } from '../../utils/dates';
import { formatSignedNaira } from '../../utils/money';
import { Badge } from '../ui/Badge';

interface TransactionItemProps {
  transaction: Transaction;
  onSelect: (tx: Transaction) => void;
}

export function TransactionItem({ transaction, onSelect }: TransactionItemProps) {
  const isCredit = transaction.type === 'credit';
  const counterpartyLine = [
    transaction.counterparty.name,
    transaction.counterparty.bankName,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="w-full text-left px-4 sm:px-5 py-3.5 min-h-[64px] flex items-center justify-between gap-3 hover:bg-subtle/60 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isCredit ? 'bg-credit-bg text-credit' : 'bg-debit-bg text-debit'
          }`}
          aria-hidden="true"
        >
          {isCredit ? (
            <ArrowDownLeft className="w-4 h-4" />
          ) : (
            <ArrowUpRight className="w-4 h-4" />
          )}
        </span>

        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{transaction.description}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
            <span className="truncate max-w-[190px] sm:max-w-xs">{counterpartyLine}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">{formatShortTime(transaction.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`text-sm font-semibold font-mono tabular-nums whitespace-nowrap ${
            isCredit ? 'text-credit' : 'text-debit'
          }`}
        >
          {formatSignedNaira(transaction.amountKobo, transaction.type)}
        </span>
        <Badge status={transaction.status} />
      </div>
    </button>
  );
}
