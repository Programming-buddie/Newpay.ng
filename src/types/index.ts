export type CurrencyCode = 'NGN';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string; // ISO 8601
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string; // 10 digits
  accountName: string;
  bankName: string;
  currency: CurrencyCode;
  balanceKobo: number;
}

export type TransactionType = 'debit' | 'credit';
export type TransactionCategory = 'transfer' | 'deposit' | 'funding';
export type TransactionStatus = 'successful' | 'pending' | 'failed';

export interface Counterparty {
  name: string;
  bankName?: string;
  accountNumber?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  reference: string;
  type: TransactionType;
  category: TransactionCategory;
  amountKobo: number;
  currency: CurrencyCode;
  status: TransactionStatus;
  description: string;
  narration?: string;
  counterparty: Counterparty;
  balanceAfterKobo?: number;
  createdAt: string; // ISO 8601
}

export interface Session {
  token: string;
  user: User;
  expiresAt: string; // ISO 8601
}

export interface Bank {
  code: string;
  name: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'UNAUTHORIZED'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_AMOUNT'
  | 'ACCOUNT_NOT_FOUND'
  | 'DUPLICATE_REQUEST'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED';

export interface ApiErrorShape {
  code: ApiErrorCode | string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode | string;
  public readonly fieldErrors?: Record<string, string>;
  public readonly status?: number;

  constructor(params: ApiErrorShape & { status?: number }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
    this.status = params.status;
  }
}

// Service Request & Response Contracts

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

export interface BalanceResponse {
  balanceKobo: number;
  currency: CurrencyCode;
}

export interface TransferInput {
  idempotencyKey: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amountKobo: number;
  narration?: string;
}

export interface SimulateIncomingInput {
  idempotencyKey: string;
  senderName: string;
  amountKobo: number;
  narration?: string;
}

export interface MoneyMovementResult {
  transaction: Transaction;
  account: Account;
}

export interface GetTransactionsParams {
  type?: TransactionType;
  page?: number;
  pageSize?: number;
}

export interface PaginatedTransactions {
  items: Transaction[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PasswordResetResponse {
  message: string;
}

export interface UserPreferences {
  hideBalanceByDefault: boolean;
}
