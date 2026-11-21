import { BRAND } from '../../config/brand';
import {
  Account,
  ApiError,
  BalanceResponse,
  Bank,
  GetTransactionsParams,
  LoginInput,
  MoneyMovementResult,
  PaginatedTransactions,
  PasswordResetResponse,
  RegisterInput,
  Session,
  SimulateIncomingInput,
  Transaction,
  TransferInput,
  User,
  UserPreferences,
} from '../../types';
import { normalizeNigerianPhone } from '../../utils/phone';
import {
  getPasswordStrength,
  validateAccountNumber,
  validateEmail,
  validateName,
  validateNarration,
} from '../../utils/validation';
import { WalletApiService } from '../api.interface';
import { NIGERIAN_BANKS } from './banks';
import { createSeedState } from './seedData';
import {
  clearDatabase,
  getBrowserStorage,
  loadDatabase,
  MockDatabaseState,
  obfuscateDemoPassword,
  saveDatabase,
  StorageBackend,
  StoredDemoUser,
} from './storage';

export interface MockApiOptions {
  storage?: StorageBackend;
  latencyMs?: number;
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function generateReference(prefix: string): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `NPY-${prefix}-${stamp}-${rand}`;
}

function generateUniqueAccountNumber(existingAccounts: Record<string, Account>): string {
  const used = new Set(Object.values(existingAccounts).map((acc) => acc.accountNumber));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    // 10-digit NUBAN-style demo account starting with 20
    const tail = Math.floor(10_000_000 + Math.random() * 89_999_999);
    const candidate = `20${tail}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return `20${Date.now().toString().slice(-8)}`;
}

function stripCredentials(user: StoredDemoUser): User {
  const { demoCredentialHash: _ignored, ...safeUser } = user;
  return safeUser;
}

export function createMockApi(options: MockApiOptions = {}): WalletApiService {
  const storage = options.storage ?? getBrowserStorage();
  const baseLatency = options.latencyMs ?? 650;

  const wait = async (ms = baseLatency) => {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  };

  const getState = (): MockDatabaseState => loadDatabase(storage, createSeedState);

  const commitState = (state: MockDatabaseState) => {
    saveDatabase(storage, state);
  };

  const requireAuthenticatedState = (): { state: MockDatabaseState; userId: string } => {
    const state = getState();
    const session = state.activeSession;
    if (!session) {
      throw new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please sign in again.',
        status: 401,
      });
    }
    const expiresAtMs = new Date(session.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      state.activeSession = null;
      commitState(state);
      throw new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please sign in again.',
        status: 401,
      });
    }
    if (!state.usersById[session.user.id]) {
      state.activeSession = null;
      commitState(state);
      throw new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Account session could not be verified. Please sign in again.',
        status: 401,
      });
    }
    return { state, userId: session.user.id };
  };

  return {
    async register(input: RegisterInput): Promise<Session> {
      await wait();
      const fieldErrors: Record<string, string> = {};

      const firstErr = validateName(input.firstName, 'First name');
      if (firstErr) fieldErrors.firstName = firstErr;

      const lastErr = validateName(input.lastName, 'Last name');
      if (lastErr) fieldErrors.lastName = lastErr;

      const emailErr = validateEmail(input.email);
      if (emailErr) fieldErrors.email = emailErr;

      const normalizedPhone = normalizeNigerianPhone(input.phone);
      if (!normalizedPhone) {
        fieldErrors.phone = 'Enter a valid phone number (e.g. 08012345678 or +2348012345678).';
      }

      const pwStrength = getPasswordStrength(input.password);
      if (!pwStrength.meetsPolicy) {
        fieldErrors.password = 'Password must be at least 8 characters and include letters and numbers.';
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Please correct the highlighted fields.',
          fieldErrors,
          status: 400,
        });
      }

      const state = getState();
      const emailKey = input.email.trim().toLowerCase();

      if (state.userIdByEmail[emailKey]) {
        throw new ApiError({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
          fieldErrors: { email: 'This email is already registered.' },
          status: 409,
        });
      }

      const now = new Date().toISOString();
      const userId = generateId('usr');
      const accountId = generateId('acc');
      const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;

      const newUser: StoredDemoUser = {
        id: userId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: emailKey,
        phone: normalizedPhone!,
        createdAt: now,
        demoCredentialHash: obfuscateDemoPassword(input.password),
      };

      const newAccount: Account = {
        id: accountId,
        userId,
        accountNumber: generateUniqueAccountNumber(state.accountsByUserId),
        accountName: fullName,
        bankName: BRAND.demoBankName,
        currency: BRAND.currencyCode,
        balanceKobo: BRAND.initialFundingKobo,
      };

      const welcomeTx: Transaction = {
        id: generateId('txn'),
        accountId,
        reference: generateReference('FUND'),
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
        createdAt: now,
      };

      const sessionUser = stripCredentials(newUser);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const session: Session = {
        token: `demo_tok_${generateId('ses')}`,
        user: sessionUser,
        expiresAt,
      };

      state.usersById[userId] = newUser;
      state.userIdByEmail[emailKey] = userId;
      state.accountsByUserId[userId] = newAccount;
      state.transactionsByUserId[userId] = [welcomeTx];
      state.preferencesByUserId[userId] = { hideBalanceByDefault: false };
      state.idempotencyByUserId[userId] = {};
      state.activeSession = { ...session, remember: true };

      commitState(state);
      return session;
    },

    async login(input: LoginInput): Promise<Session> {
      await wait();
      const emailErr = validateEmail(input.email);
      if (emailErr || !input.password) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Enter your email address and password.',
          fieldErrors: {
            ...(emailErr ? { email: emailErr } : {}),
            ...(!input.password ? { password: 'Password is required.' } : {}),
          },
          status: 400,
        });
      }

      const state = getState();
      const emailKey = input.email.trim().toLowerCase();
      const userId = state.userIdByEmail[emailKey];
      const storedUser = userId ? state.usersById[userId] : undefined;

      if (!storedUser || storedUser.demoCredentialHash !== obfuscateDemoPassword(input.password)) {
        throw new ApiError({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
          status: 401,
        });
      }

      const ttlMs = input.remember ? 14 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
      const session: Session = {
        token: `demo_tok_${generateId('ses')}`,
        user: stripCredentials(storedUser),
        expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      };

      state.activeSession = { ...session, remember: input.remember };
      commitState(state);
      return session;
    },

    async logout(): Promise<void> {
      await wait(Math.min(baseLatency, 200));
      const state = getState();
      state.activeSession = null;
      commitState(state);
    },

    async getCurrentUser(): Promise<User> {
      await wait(0);
      const { state, userId } = requireAuthenticatedState();
      return stripCredentials(state.usersById[userId]);
    },

    async getAccount(): Promise<Account> {
      await wait(Math.min(baseLatency, 200));
      const { state, userId } = requireAuthenticatedState();
      const account = state.accountsByUserId[userId];
      if (!account) {
        throw new ApiError({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Wallet account could not be found.',
          status: 404,
        });
      }
      return { ...account };
    },

    async getBalance(): Promise<BalanceResponse> {
      await wait(0);
      const { state, userId } = requireAuthenticatedState();
      const account = state.accountsByUserId[userId];
      if (!account) {
        throw new ApiError({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Wallet account could not be found.',
          status: 404,
        });
      }
      return {
        balanceKobo: account.balanceKobo,
        currency: account.currency,
      };
    },

    async transfer(input: TransferInput): Promise<MoneyMovementResult> {
      await wait(Math.max(baseLatency, 650));
      const { state, userId } = requireAuthenticatedState();
      const account = state.accountsByUserId[userId];
      if (!account) {
        throw new ApiError({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Sender account was not found.',
          status: 404,
        });
      }

      // Enforce idempotency: a repeated key returns the original transaction without creating a duplicate
      const userIdemp = state.idempotencyByUserId[userId] ?? {};
      const existingIdemp = userIdemp[input.idempotencyKey];
      if (existingIdemp) {
        const existingTx = (state.transactionsByUserId[userId] ?? []).find(
          (t) => t.id === existingIdemp.transactionId
        );
        if (existingTx) {
          return {
            transaction: { ...existingTx },
            account: { ...account },
          };
        }
      }

      const fieldErrors: Record<string, string> = {};
      const bank = NIGERIAN_BANKS.find((b) => b.code === input.bankCode);
      if (!bank) {
        fieldErrors.bankCode = 'Please select a valid bank.';
      }

      const acctErr = validateAccountNumber(input.accountNumber);
      if (acctErr) {
        fieldErrors.accountNumber = acctErr;
      } else if (input.accountNumber.trim() === account.accountNumber) {
        fieldErrors.accountNumber = 'You cannot transfer to your own account number.';
      }

      if (!input.accountName.trim()) {
        fieldErrors.accountName = 'Recipient name is required.';
      }

      if (input.narration) {
        const narrErr = validateNarration(input.narration);
        if (narrErr) fieldErrors.narration = narrErr;
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: Object.values(fieldErrors)[0],
          fieldErrors,
          status: 400,
        });
      }

      if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 100) {
        throw new ApiError({
          code: 'INVALID_AMOUNT',
          message: 'Minimum transfer amount is ₦1.00.',
          fieldErrors: { amount: 'Minimum transfer amount is ₦1.00.' },
          status: 400,
        });
      }

      if (input.amountKobo > account.balanceKobo) {
        throw new ApiError({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient balance for this transfer.',
          fieldErrors: { amount: 'Amount exceeds your available balance.' },
          status: 422,
        });
      }

      // Atomic balance update + single transaction record
      const newBalanceKobo = account.balanceKobo - input.amountKobo;
      const updatedAccount: Account = {
        ...account,
        balanceKobo: newBalanceKobo,
      };

      const cleanRecipientName = input.accountName.trim();
      const cleanNarration = input.narration?.trim() || undefined;
      const transaction: Transaction = {
        id: generateId('txn'),
        accountId: account.id,
        reference: generateReference('TRF'),
        type: 'debit',
        category: 'transfer',
        amountKobo: input.amountKobo,
        currency: account.currency,
        status: 'successful',
        description: `Transfer to ${cleanRecipientName}`,
        narration: cleanNarration,
        counterparty: {
          name: cleanRecipientName,
          bankName: bank!.name,
          accountNumber: input.accountNumber.trim(),
        },
        balanceAfterKobo: newBalanceKobo,
        createdAt: new Date().toISOString(),
      };

      state.accountsByUserId[userId] = updatedAccount;
      state.transactionsByUserId[userId] = [
        transaction,
        ...(state.transactionsByUserId[userId] ?? []),
      ];
      state.idempotencyByUserId[userId] = {
        ...userIdemp,
        [input.idempotencyKey]: { transactionId: transaction.id },
      };

      commitState(state);
      return {
        transaction: { ...transaction },
        account: { ...updatedAccount },
      };
    },

    async simulateIncoming(input: SimulateIncomingInput): Promise<MoneyMovementResult> {
      await wait(Math.max(baseLatency, 650));
      const { state, userId } = requireAuthenticatedState();
      const account = state.accountsByUserId[userId];
      if (!account) {
        throw new ApiError({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account was not found.',
          status: 404,
        });
      }

      // Idempotency protection for simulated deposits too
      const userIdemp = state.idempotencyByUserId[userId] ?? {};
      const existingIdemp = userIdemp[input.idempotencyKey];
      if (existingIdemp) {
        const existingTx = (state.transactionsByUserId[userId] ?? []).find(
          (t) => t.id === existingIdemp.transactionId
        );
        if (existingTx) {
          return {
            transaction: { ...existingTx },
            account: { ...account },
          };
        }
      }

      const fieldErrors: Record<string, string> = {};
      if (!input.senderName.trim()) {
        fieldErrors.senderName = 'Sender name is required.';
      }
      if (input.narration) {
        const narrErr = validateNarration(input.narration);
        if (narrErr) fieldErrors.narration = narrErr;
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: Object.values(fieldErrors)[0],
          fieldErrors,
          status: 400,
        });
      }

      if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 100) {
        throw new ApiError({
          code: 'INVALID_AMOUNT',
          message: 'Minimum amount is ₦1.00.',
          fieldErrors: { amount: 'Minimum amount is ₦1.00.' },
          status: 400,
        });
      }

      const newBalanceKobo = account.balanceKobo + input.amountKobo;
      const updatedAccount: Account = {
        ...account,
        balanceKobo: newBalanceKobo,
      };

      const cleanSender = input.senderName.trim();
      const cleanNarration = input.narration?.trim() || undefined;
      const transaction: Transaction = {
        id: generateId('txn'),
        accountId: account.id,
        reference: generateReference('DEP'),
        type: 'credit',
        category: 'deposit',
        amountKobo: input.amountKobo,
        currency: account.currency,
        status: 'successful',
        description: `Incoming payment from ${cleanSender}`,
        narration: cleanNarration,
        counterparty: {
          name: cleanSender,
          bankName: 'External Bank',
        },
        balanceAfterKobo: newBalanceKobo,
        createdAt: new Date().toISOString(),
      };

      state.accountsByUserId[userId] = updatedAccount;
      state.transactionsByUserId[userId] = [
        transaction,
        ...(state.transactionsByUserId[userId] ?? []),
      ];
      state.idempotencyByUserId[userId] = {
        ...userIdemp,
        [input.idempotencyKey]: { transactionId: transaction.id },
      };

      commitState(state);
      return {
        transaction: { ...transaction },
        account: { ...updatedAccount },
      };
    },

    async getTransactions(params: GetTransactionsParams = {}): Promise<PaginatedTransactions> {
      await wait(Math.min(baseLatency, 150));
      const { state, userId } = requireAuthenticatedState();
      const all = [...(state.transactionsByUserId[userId] ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const filtered = params.type ? all.filter((tx) => tx.type === params.type) : all;
      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.max(1, params.pageSize ?? 50);
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);

      return {
        items,
        page,
        pageSize,
        total: filtered.length,
      };
    },

    async getBanks(): Promise<Bank[]> {
      await wait(0);
      return NIGERIAN_BANKS;
    },

    async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
      await wait(Math.min(baseLatency, 350));
      const emailErr = validateEmail(email);
      if (emailErr) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: emailErr,
          fieldErrors: { email: emailErr },
          status: 400,
        });
      }
      return {
        message:
          'If an account matches this email address, password reset instructions have been sent.',
      };
    },

    async getPreferences(): Promise<UserPreferences> {
      await wait(0);
      const { state, userId } = requireAuthenticatedState();
      return state.preferencesByUserId[userId] ?? { hideBalanceByDefault: false };
    },

    async updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
      await wait(0);
      const { state, userId } = requireAuthenticatedState();
      const current = state.preferencesByUserId[userId] ?? { hideBalanceByDefault: false };
      const updated = { ...current, ...prefs };
      state.preferencesByUserId[userId] = updated;
      commitState(state);
      return updated;
    },

    async resetDemoData(): Promise<void> {
      await wait(Math.min(baseLatency, 250));
      clearDatabase(storage);
      loadDatabase(storage, createSeedState);
    },
  };
}

export const mockApi: WalletApiService = createMockApi();
