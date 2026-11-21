import { ENV } from '../../config/env';
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
  TransferInput,
  User,
  UserPreferences,
} from '../../types';
import { WalletApiService } from '../api.interface';

const TOKEN_STORAGE_KEY = 'newpay:http_token';

let onUnauthorizedCallback: (() => void) | null = null;

export function setHttpUnauthorizedHandler(handler: () => void) {
  onUnauthorizedCallback = handler;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Central fetch helper for the future real backend.
 * - Attaches Authorization: Bearer <token>
 * - Parses standard { error: { code, message, fieldErrors } } payloads into ApiError
 * - Clears session and triggers redirect hook on HTTP 401
 */
export async function httpRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    onUnauthorizedCallback?.();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errBody = data?.error;
    throw new ApiError({
      code: errBody?.code ?? 'INTERNAL_ERROR',
      message: errBody?.message ?? 'An unexpected server error occurred.',
      fieldErrors: errBody?.fieldErrors,
      status: response.status,
    });
  }

  return data as T;
}

function notImplemented(sectionRef: string, proposedEndpoint: string): never {
  throw new ApiError({
    code: 'NOT_IMPLEMENTED',
    message: `Not implemented: connect backend here (${proposedEndpoint} — see API_CONTRACT.md ${sectionRef}).`,
    status: 501,
  });
}

/**
 * Documented HTTP API stub.
 * All endpoint paths below are PROPOSED – to be confirmed with the backend developer.
 */
export const httpApi: WalletApiService = {
  async register(_input: RegisterInput): Promise<Session> {
    // TODO (API_CONTRACT.md §1 Register):
    // PROPOSED – to be confirmed with backend developer: POST /auth/register
    // Expected request: { firstName, lastName, email, phone, password }
    // Expected response: { token, user, expiresAt }
    // Note: Store returned token in TOKEN_STORAGE_KEY or secure cookie as agreed.
    return notImplemented('§1', 'POST /auth/register');
  },

  async login(_input: LoginInput): Promise<Session> {
    // TODO (API_CONTRACT.md §2 Login):
    // PROPOSED – to be confirmed with backend developer: POST /auth/login
    // Expected request: { email, password, remember }
    // Expected response: { token, user, expiresAt }
    return notImplemented('§2', 'POST /auth/login');
  },

  async logout(): Promise<void> {
    // TODO (API_CONTRACT.md §3 Logout):
    // PROPOSED – to be confirmed with backend developer: POST /auth/logout
    // Expected response: 204 No Content or { ok: true }
    return notImplemented('§3', 'POST /auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    // TODO (API_CONTRACT.md §4 Current User):
    // PROPOSED – to be confirmed with backend developer: GET /users/me
    // Expected response: User
    return notImplemented('§4', 'GET /users/me');
  },

  async getAccount(): Promise<Account> {
    // TODO (API_CONTRACT.md §5 Account):
    // PROPOSED – to be confirmed with backend developer: GET /accounts/me
    // Expected response: ApiAccountDto -> map with fromApi.account()
    return notImplemented('§5', 'GET /accounts/me');
  },

  async getBalance(): Promise<BalanceResponse> {
    // TODO (API_CONTRACT.md §6 Balance):
    // PROPOSED – to be confirmed with backend developer: GET /accounts/me/balance
    // Expected response: { balanceKobo, currency }
    return notImplemented('§6', 'GET /accounts/me/balance');
  },

  async transfer(_input: TransferInput): Promise<MoneyMovementResult> {
    // TODO (API_CONTRACT.md §7 Transfer):
    // PROPOSED – to be confirmed with backend developer: POST /transfers
    // Expected request: toApi.transferRequest(input) with idempotencyKey
    // Expected response: { transaction: ApiTransactionDto, account: ApiAccountDto } -> map with fromApi
    return notImplemented('§7', 'POST /transfers');
  },

  async simulateIncoming(_input: SimulateIncomingInput): Promise<MoneyMovementResult> {
    // TODO (API_CONTRACT.md §8 Incoming Payments):
    // Demo-only operation. In production, incoming credits originate from payment gateway/NIP webhooks,
    // not a client endpoint. Remove or hide simulation UI when USE_MOCK_API is false.
    return notImplemented('§8', 'Demo-only (no production endpoint)');
  },

  async getTransactions(_params?: GetTransactionsParams): Promise<PaginatedTransactions> {
    // TODO (API_CONTRACT.md §9 Transactions):
    // PROPOSED – to be confirmed with backend developer: GET /transactions?type=&page=&pageSize=
    // Expected response: { items: ApiTransactionDto[], page, pageSize, total }
    return notImplemented('§9', 'GET /transactions');
  },

  async getBanks(): Promise<Bank[]> {
    // TODO (API_CONTRACT.md §10 Banks):
    // PROPOSED – to be confirmed with backend developer: GET /banks
    // Expected response: Array<{ code: string, name: string }>
    return notImplemented('§10', 'GET /banks');
  },

  async requestPasswordReset(_email: string): Promise<PasswordResetResponse> {
    // TODO (API_CONTRACT.md §11 Password Reset):
    // PROPOSED – to be confirmed with backend developer: POST /auth/forgot-password
    // Expected request: { email }
    // Expected response: { message }
    return notImplemented('§11', 'POST /auth/forgot-password');
  },

  async getPreferences(): Promise<UserPreferences> {
    // TODO (API_CONTRACT.md §12 User Preferences):
    // PROPOSED – to be confirmed with backend developer: GET /users/me/preferences
    return notImplemented('§12', 'GET /users/me/preferences');
  },

  async updatePreferences(_prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    // TODO (API_CONTRACT.md §12 User Preferences):
    // PROPOSED – to be confirmed with backend developer: PATCH /users/me/preferences
    return notImplemented('§12', 'PATCH /users/me/preferences');
  },

  async resetDemoData(): Promise<void> {
    return notImplemented('§8', 'Demo-only (not available in HTTP mode)');
  },
};
