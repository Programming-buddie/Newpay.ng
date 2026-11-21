import { BRAND } from '../../config/brand';
import { Account, Transaction } from '../../types';
import { MockDatabaseState, obfuscateDemoPassword, StoredDemoUser } from './storage';

export const DEMO_ACCOUNT_CREDENTIALS = {
  email: 'demo@newpay.app',
  password: 'DemoUser1',
} as const;

export function createSeedState(): MockDatabaseState {
  const demoUserId = 'usr_demo_001';
  const demoAccountId = 'acc_demo_001';
  const createdAt = '2026-11-01T09:00:00.000Z';

  const demoUser: StoredDemoUser = {
    id: demoUserId,
    firstName: 'Adaeze',
    lastName: 'Okafor',
    email: DEMO_ACCOUNT_CREDENTIALS.email,
    phone: '+2348012345678',
    createdAt,
    demoCredentialHash: obfuscateDemoPassword(DEMO_ACCOUNT_CREDENTIALS.password),
  };

  const demoAccount: Account = {
    id: demoAccountId,
    userId: demoUserId,
    accountNumber: '2048193052',
    accountName: 'Adaeze Okafor',
    bankName: BRAND.demoBankName,
    currency: BRAND.currencyCode,
    balanceKobo: BRAND.initialFundingKobo,
  };

  const welcomeTx: Transaction = {
    id: 'txn_demo_welcome_001',
    accountId: demoAccountId,
    reference: 'NPY-FUND-20261101-0001',
    type: 'credit',
    category: 'funding',
    amountKobo: BRAND.initialFundingKobo,
    currency: BRAND.currencyCode,
    status: 'successful',
    description: 'Welcome bonus',
    narration: 'Initial wallet welcome credit',
    counterparty: {
      name: BRAND.name,
      bankName: BRAND.demoBankName,
    },
    balanceAfterKobo: BRAND.initialFundingKobo,
    createdAt,
  };

  return {
    version: 1,
    usersById: {
      [demoUserId]: demoUser,
    },
    userIdByEmail: {
      [demoUser.email.toLowerCase()]: demoUserId,
    },
    accountsByUserId: {
      [demoUserId]: demoAccount,
    },
    transactionsByUserId: {
      [demoUserId]: [welcomeTx],
    },
    preferencesByUserId: {
      [demoUserId]: {
        hideBalanceByDefault: false,
      },
    },
    idempotencyByUserId: {
      [demoUserId]: {},
    },
    activeSession: null,
  };
}
