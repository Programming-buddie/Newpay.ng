import { useMemo, useState } from 'react';
import { TransactionType } from '../types';
import { useAccountContext } from '../context/AccountContext';

export type TransactionFilter = 'all' | TransactionType;

export function useTransactions(initialFilter: TransactionFilter = 'all') {
  const { transactions, isLoading, refreshWalletData } = useAccountContext();
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter);

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((tx) => tx.type === filter);
  }, [transactions, filter]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    filter,
    setFilter,
    isLoading,
    refreshTransactions: refreshWalletData,
  };
}
