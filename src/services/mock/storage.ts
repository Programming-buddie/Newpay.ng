import { Account, Session, Transaction, User, UserPreferences } from '../../types';

export const STORAGE_KEY = 'newpay:v1';

/**
 * DEMO-ONLY credential record.
 * Security honesty: localStorage is NOT a secure authentication store.
 * Real password hashing (bcrypt/Argon2) and session signing happen exclusively on the backend.
 */
export interface StoredDemoUser extends User {
  demoCredentialHash: string;
}

export interface StoredSession extends Session {
  remember: boolean;
}

export interface MockDatabaseState {
  version: 1;
  usersById: Record<string, StoredDemoUser>;
  userIdByEmail: Record<string, string>;
  accountsByUserId: Record<string, Account>;
  transactionsByUserId: Record<string, Transaction[]>;
  preferencesByUserId: Record<string, UserPreferences>;
  idempotencyByUserId: Record<
    string,
    Record<string, { transactionId: string }>
  >;
  activeSession: StoredSession | null;
}

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(): StorageBackend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

export function getBrowserStorage(): StorageBackend {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return createMemoryStorage();
}

/**
 * Minimal non-secure obfuscation for demo-only credentials stored in browser localStorage.
 * NEVER use this in production.
 */
export function obfuscateDemoPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i += 1) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return `demo_${(hash >>> 0).toString(16)}`;
}

export function loadDatabase(
  storage: StorageBackend,
  createSeedState: () => MockDatabaseState
): MockDatabaseState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedState();
      saveDatabase(storage, seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as MockDatabaseState;
    if (!parsed || parsed.version !== 1 || !parsed.usersById) {
      const seeded = createSeedState();
      saveDatabase(storage, seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedState();
    saveDatabase(storage, seeded);
    return seeded;
  }
}

export function saveDatabase(storage: StorageBackend, state: MockDatabaseState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearDatabase(storage: StorageBackend): void {
  storage.removeItem(STORAGE_KEY);
}
