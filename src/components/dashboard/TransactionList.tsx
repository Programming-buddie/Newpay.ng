import React, { useState } from 'react';
import { Transaction } from '../../types';
import { formatDateTime } from '../../utils/dates';
import { formatNaira, formatSignedNaira } from '../../utils/money';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function TransactionList({
  transactions,
  isLoading = false,
  emptyTitle = 'No transactions yet',
  emptyDescription = 'Your transfers and incoming payments will appear here.',
  emptyActionLabel,
  onEmptyAction,
}: TransactionListProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  if (isLoading && transactions.length === 0) {
    return (
      <div className="divide-y divide-line">
        {[1, 2, 3].map((row) => (
          <div key={row} className="px-5 py-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-subtle" />
              <div className="space-y-2">
                <div className="h-3.5 w-40 bg-subtle rounded" />
                <div className="h-3 w-28 bg-subtle rounded" />
              </div>
            </div>
            <div className="h-4 w-20 bg-subtle rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-line" data-testid="transaction-list">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} onSelect={setSelectedTx} />
        ))}
      </div>

      <Modal
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title="Transaction details"
        description={selectedTx?.reference}
      >
        {selectedTx && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-canvas border border-line flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted">
                  {selectedTx.type === 'credit' ? 'Money received' : 'Money sent'}
                </p>
                <p
                  className={`mt-1 text-2xl font-display font-bold font-mono tabular-nums ${
                    selectedTx.type === 'credit' ? 'text-credit' : 'text-debit'
                  }`}
                >
                  {formatSignedNaira(selectedTx.amountKobo, selectedTx.type)}
                </p>
              </div>
              <Badge status={selectedTx.status} />
            </div>

            <dl className="divide-y divide-line text-sm">
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Description</dt>
                <dd className="font-medium text-ink text-right">{selectedTx.description}</dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">
                  {selectedTx.type === 'credit' ? 'Sender' : 'Recipient'}
                </dt>
                <dd className="font-medium text-ink text-right">
                  {selectedTx.counterparty.name}
                </dd>
              </div>
              {selectedTx.counterparty.bankName && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Bank</dt>
                  <dd className="font-medium text-ink text-right">
                    {selectedTx.counterparty.bankName}
                  </dd>
                </div>
              )}
              {selectedTx.counterparty.accountNumber && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Account number</dt>
                  <dd className="font-mono tabular-nums text-ink text-right">
                    {selectedTx.counterparty.accountNumber}
                  </dd>
                </div>
              )}
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Reference</dt>
                <dd className="font-mono text-xs text-ink text-right break-all">
                  {selectedTx.reference}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Date & time</dt>
                <dd className="text-ink text-right tabular-nums">
                  {formatDateTime(selectedTx.createdAt)}
                </dd>
              </div>
              {selectedTx.narration && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Narration</dt>
                  <dd className="text-ink text-right">{selectedTx.narration}</dd>
                </div>
              )}
              {selectedTx.balanceAfterKobo !== undefined && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Balance after</dt>
                  <dd className="font-mono font-semibold tabular-nums text-ink text-right">
                    {formatNaira(selectedTx.balanceAfterKobo)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}
