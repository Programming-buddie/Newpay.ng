import {
  Account,
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
} from '../types';

export interface WalletApiService {
  register(input: RegisterInput): Promise<Session>;
  login(input: LoginInput): Promise<Session>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User>;
  getAccount(): Promise<Account>;
  getBalance(): Promise<BalanceResponse>;
  transfer(input: TransferInput): Promise<MoneyMovementResult>;
  simulateIncoming(input: SimulateIncomingInput): Promise<MoneyMovementResult>;
  getTransactions(params?: GetTransactionsParams): Promise<PaginatedTransactions>;
  getBanks(): Promise<Bank[]>;
  requestPasswordReset(email: string): Promise<PasswordResetResponse>;
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences>;
  resetDemoData(): Promise<void>;
}
