import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ENV } from '../config/env';
import { walletApi } from '../services';
import {
  executeSimulateIncoming,
  executeTransfer,
  subscribeToTransactions,
  subscribeToWalletAccount,
  updateUserPreferences,
} from '../services/firebase/firebaseWalletService';
import { NIGERIAN_BANKS } from '../services/mock/banks';
import {
  Account,
  ApiError,
  Bank,
  MoneyMovementResult,
  SimulateIncomingInput,
  Transaction,
  TransferInput,
  UserPreferences,
} from '../types';
import { useAuthContext } from './AuthContext';

interface AccountContextValue {
  account: Account | null;
  transactions: Transaction[];
  banks: Bank[];
  preferences: UserPreferences;
  isLoading: boolean;
  isBalanceHidden: boolean;
  activityNotice: string | null;
  clearActivityNotice: () => void;
  toggleBalanceVisibility: () => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<UserPreferences>;
  refreshWalletData: () => Promise<void>;
  sendTransfer: (input: TransferInput) => Promise<MoneyMovementResult>;
  simulateIncoming: (input: SimulateIncomingInput) => Promise<MoneyMovementResult>;
  resetDemoData: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, profilePreferences, isInitializing, clearLocalAuth } = useAuthContext();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>(NIGERIAN_BANKS);
  const [preferences, setPreferences] = useState<UserPreferences>({
    hideBalanceByDefault: false,
  });
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activityNotice, setActivityNotice] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  // Sync hideBalanceByDefault preference from Firestore profile
  useEffect(() => {
    if (!ENV.USE_MOCK_API) {
      setPreferences(profilePreferences);
      setIsBalanceHidden(profilePreferences.hideBalanceByDefault);
    }
  }, [profilePreferences]);

  const refreshWalletData = useCallback(async () => {
    if (!user) {
      setAccount(null);
      setTransactions([]);
      setActivityNotice(null);
      return;
    }

    if (!ENV.USE_MOCK_API) {
      // Real-time Firestore onSnapshot listeners keep account and transactions synchronized
      return;
    }

    setIsLoading(true);
    try {
      const [acct, txPage, bankList, prefs] = await Promise.all([
        walletApi.getAccount(),
        walletApi.getTransactions({ page: 1, pageSize: 100 }),
        walletApi.getBanks(),
        walletApi.getPreferences(),
      ]);
      setAccount(acct);
      setTransactions(txPage.items);
      setBanks(bankList);
      setPreferences(prefs);
      setIsBalanceHidden(prefs.hideBalanceByDefault);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (ENV.USE_MOCK_API) {
      if (user) {
        refreshWalletData().catch(() => {
          // Handled by UI error boundary / auth redirects
        });
      } else {
        setAccount(null);
        setTransactions([]);
        setPreferences({ hideBalanceByDefault: false });
        setIsBalanceHidden(false);
        setActivityNotice(null);
      }
      return;
    }

    // Only attach Firestore onSnapshot listeners when auth is ready and user is authenticated
    if (isInitializing || !user) {
      if (!user) {
        setAccount(null);
        setTransactions([]);
        setIsBalanceHidden(false);
        setActivityNotice(null);
      }
      return;
    }

    setBanks(NIGERIAN_BANKS);
    setIsLoading(true);
    let walletLoaded = false;
    let txLoaded = false;
    const markLoaded = () => {
      if (walletLoaded && txLoaded) {
        setIsLoading(false);
      }
    };

    const unsubWallet = subscribeToWalletAccount(
      user.id,
      (acct) => {
        setAccount(acct);
        walletLoaded = true;
        markLoaded();
      },
      (err) => {
        setIsLoading(false);
        setFatalError(err);
      }
    );

    const unsubTx = subscribeToTransactions(
      user.id,
      (items) => {
        setTransactions(items);
        txLoaded = true;
        markLoaded();
      },
      (err) => {
        setIsLoading(false);
        setFatalError(err);
      }
    );

    return () => {
      unsubWallet();
      unsubTx();
    };
  }, [user, isInitializing, refreshWalletData]);

  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceHidden((prev) => !prev);
  }, []);

  const updatePreferences = useCallback(
    async (prefs: Partial<UserPreferences>) => {
      if (!ENV.USE_MOCK_API) {
        if (!user) {
          throw new ApiError({
            code: 'UNAUTHORIZED',
            message: 'Please sign in to update preferences.',
            status: 401,
          });
        }
        const updated = await updateUserPreferences(user.id, prefs);
        setPreferences(updated);
        if (prefs.hideBalanceByDefault !== undefined) {
          setIsBalanceHidden(prefs.hideBalanceByDefault);
        }
        return updated;
      }

      const updated = await walletApi.updatePreferences(prefs);
      setPreferences(updated);
      if (prefs.hideBalanceByDefault !== undefined) {
        setIsBalanceHidden(prefs.hideBalanceByDefault);
      }
      return updated;
    },
    [user]
  );

  const sendTransfer = useCallback(
    async (input: TransferInput): Promise<MoneyMovementResult> => {
      if (!ENV.USE_MOCK_API) {
        if (!user) {
          throw new ApiError({
            code: 'UNAUTHORIZED',
            message: 'Please sign in to send money.',
            status: 401,
          });
        }
        const result = await executeTransfer(user.id, input);
        setAccount(result.account);
        setActivityNotice(
          `Sent transfer to ${result.transaction.counterparty.name} (${result.transaction.reference}).`
        );
        return result;
      }

      const result = await walletApi.transfer(input);
      setAccount(result.account);
      const txPage = await walletApi.getTransactions({ page: 1, pageSize: 100 });
      setTransactions(txPage.items);
      setActivityNotice(
        `Sent transfer to ${result.transaction.counterparty.name} (${result.transaction.reference}).`
      );
      return result;
    },
    [user]
  );

  const simulateIncoming = useCallback(
    async (input: SimulateIncomingInput): Promise<MoneyMovementResult> => {
      if (!ENV.USE_MOCK_API) {
        if (!user) {
          throw new ApiError({
            code: 'UNAUTHORIZED',
            message: 'Please sign in to add funds.',
            status: 401,
          });
        }
        const result = await executeSimulateIncoming(user.id, input);
        setAccount(result.account);
        setActivityNotice(
          `Received payment from ${result.transaction.counterparty.name} (${result.transaction.reference}).`
        );
        return result;
      }

      const result = await walletApi.simulateIncoming(input);
      setAccount(result.account);
      const txPage = await walletApi.getTransactions({ page: 1, pageSize: 100 });
      setTransactions(txPage.items);
      setActivityNotice(
        `Received payment from ${result.transaction.counterparty.name} (${result.transaction.reference}).`
      );
      return result;
    },
    [user]
  );

  const resetDemoData = useCallback(async () => {
    await walletApi.resetDemoData();
    clearLocalAuth();
    setAccount(null);
    setTransactions([]);
    setActivityNotice(null);
  }, [clearLocalAuth]);

  const clearActivityNotice = useCallback(() => {
    setActivityNotice(null);
  }, []);

  return (
    <AccountContext.Provider
      value={{
        account,
        transactions,
        banks,
        preferences,
        isLoading,
        isBalanceHidden,
        activityNotice,
        clearActivityNotice,
        toggleBalanceVisibility,
        updatePreferences,
        refreshWalletData,
        sendTransfer,
        simulateIncoming,
        resetDemoData,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return ctx;
}
