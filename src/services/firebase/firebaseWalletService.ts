import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';
import { BRAND } from '../../config/brand';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import {
  Account,
  ApiError,
  MoneyMovementResult,
  SimulateIncomingInput,
  Transaction,
  TransferInput,
  User,
  UserPreferences,
} from '../../types';
import { normalizeNigerianPhone } from '../../utils/phone';
import { validateAccountNumber, validateName, validateNarration } from '../../utils/validation';
import { NIGERIAN_BANKS } from '../mock/banks';

// Constants synchronized with firebase-blueprint.json
export const PRIMARY_WALLET_ID = 'primary';
export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const ACCOUNT_NUMBER_PATTERN = /^[0-9]{10}$/;
export const PHONE_PATTERN = /^(|\+234[0-9]{10})$/;
export const MAX_NAME_LENGTH = 50;
export const MAX_NARRATION_LENGTH = 100;
export const MAX_COUNTERPARTY_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 160;
export const MAX_BALANCE_KOBO = 100_000_000_000;
export const MAX_TX_AMOUNT_KOBO = 10_000_000_000;
export const MIN_TX_AMOUNT_KOBO = 100;

export interface UserProfileSnapshot {
  user: User;
  preferences: UserPreferences;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
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

function deriveTenDigitAccountNumber(uid: string): string {
  // Deterministic 8-digit hash suffix prefixed with "20" -> valid 10-digit NUBAN-style account number
  let hash = 2166136261;
  for (let i = 0; i < uid.length; i += 1) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positive = Math.abs(hash) % 90_000_000 + 10_000_000;
  return `20${positive}`.slice(0, 10);
}

function splitDisplayName(displayName: string | null | undefined, email: string): {
  firstName: string;
  lastName: string;
} {
  const cleaned = (displayName ?? '').trim().replace(/\s+/g, ' ');
  if (cleaned) {
    const parts = cleaned.split(' ');
    const first = parts[0].slice(0, MAX_NAME_LENGTH);
    const rest = parts.slice(1).join(' ').trim();
    const last = (rest || 'User').slice(0, MAX_NAME_LENGTH);
    return {
      firstName: first || 'NewPay',
      lastName: last || 'User',
    };
  }
  const emailHandle = (email.split('@')[0] || 'NewPay').replace(/[^a-zA-Z0-9]/g, '');
  return {
    firstName: (emailHandle || 'NewPay').slice(0, MAX_NAME_LENGTH),
    lastName: 'User',
  };
}

function sanitizeIdempotencyKey(rawKey: string): string {
  const cleaned = rawKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || generateId('idemp');
}

function mapUserSnapshot(data: Record<string, unknown>, uid: string): UserProfileSnapshot {
  return {
    user: {
      id: uid,
      firstName: String(data.firstName ?? ''),
      lastName: String(data.lastName ?? ''),
      email: String(data.email ?? ''),
      phone: String(data.phone ?? ''),
      createdAt: timestampToIso(data.createdAt),
    },
    preferences: {
      hideBalanceByDefault: Boolean(data.hideBalanceByDefault),
    },
  };
}

function mapWalletSnapshot(data: Record<string, unknown>, walletId: string): Account {
  return {
    id: String(data.id ?? walletId),
    userId: String(data.userId ?? ''),
    accountNumber: String(data.accountNumber ?? ''),
    accountName: String(data.accountName ?? ''),
    bankName: String(data.bankName ?? BRAND.demoBankName),
    currency: 'NGN',
    balanceKobo: Number(data.balanceKobo ?? 0),
  };
}

function mapTransactionSnapshot(data: Record<string, unknown>, id: string): Transaction {
  return {
    id: String(data.id ?? id),
    accountId: String(data.accountId ?? PRIMARY_WALLET_ID),
    reference: String(data.reference ?? ''),
    type: data.type === 'debit' ? 'debit' : 'credit',
    category:
      data.category === 'transfer' || data.category === 'deposit' || data.category === 'funding'
        ? data.category
        : 'transfer',
    amountKobo: Number(data.amountKobo ?? 0),
    currency: 'NGN',
    status:
      data.status === 'successful' || data.status === 'pending' || data.status === 'failed'
        ? data.status
        : 'successful',
    description: String(data.description ?? ''),
    narration: typeof data.narration === 'string' && data.narration ? data.narration : undefined,
    counterparty: {
      name: String(data.counterpartyName ?? ''),
      bankName:
        typeof data.counterpartyBankName === 'string' && data.counterpartyBankName
          ? data.counterpartyBankName
          : undefined,
      accountNumber:
        typeof data.counterpartyAccountNumber === 'string' && data.counterpartyAccountNumber
          ? data.counterpartyAccountNumber
          : undefined,
    },
    balanceAfterKobo:
      typeof data.balanceAfterKobo === 'number' ? data.balanceAfterKobo : undefined,
    createdAt: timestampToIso(data.createdAt),
  };
}

/**
 * Ensures the signed-in Google user has a UserProfile, primary WalletAccount (₦500.00 welcome bonus),
 * and initial funding Transaction in Firestore.
 */
export async function ensureUserProfileAndWallet(
  firebaseUser: FirebaseUser
): Promise<{ profile: UserProfileSnapshot; isNewUser: boolean }> {
  const uid = firebaseUser.uid;
  const userPath = `users/${uid}`;
  const walletPath = `users/${uid}/wallets/${PRIMARY_WALLET_ID}`;
  const userRef = doc(db, 'users', uid);
  const walletRef = doc(db, 'users', uid, 'wallets', PRIMARY_WALLET_ID);

  let userSnap;
  let walletSnap;
  try {
    [userSnap, walletSnap] = await Promise.all([getDoc(userRef), getDoc(walletRef)]);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (userSnap.exists() && walletSnap.exists()) {
    return {
      profile: mapUserSnapshot(userSnap.data() as Record<string, unknown>, uid),
      isNewUser: false,
    };
  }

  const email = firebaseUser.email;
  if (!email) {
    throw new ApiError({
      code: 'VALIDATION_ERROR',
      message: 'Your Google account must provide a verified email address.',
      status: 400,
    });
  }

  const { firstName, lastName } = splitDisplayName(firebaseUser.displayName, email);
  const existingUserData = userSnap.exists()
    ? (userSnap.data() as Record<string, unknown>)
    : null;

  const finalFirstName = existingUserData
    ? String(existingUserData.firstName || firstName)
    : firstName;
  const finalLastName = existingUserData
    ? String(existingUserData.lastName || lastName)
    : lastName;
  const finalPhone = existingUserData ? String(existingUserData.phone ?? '') : '';
  const hideBalanceByDefault = existingUserData
    ? Boolean(existingUserData.hideBalanceByDefault)
    : false;

  const batch = writeBatch(db);

  if (!userSnap.exists()) {
    batch.set(userRef, {
      uid,
      firstName: finalFirstName,
      lastName: finalLastName,
      email,
      phone: finalPhone,
      hideBalanceByDefault,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (!walletSnap.exists()) {
    const accountNumber = deriveTenDigitAccountNumber(uid);
    const accountName = `${finalFirstName} ${finalLastName}`.trim().slice(0, 105);
    const welcomeTxId = `txn_welcome_${uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)}`;
    const welcomeTxRef = doc(db, 'users', uid, 'transactions', welcomeTxId);

    batch.set(walletRef, {
      id: PRIMARY_WALLET_ID,
      userId: uid,
      accountNumber,
      accountName,
      bankName: BRAND.demoBankName,
      currency: BRAND.currencyCode,
      balanceKobo: BRAND.initialFundingKobo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(welcomeTxRef, {
      id: welcomeTxId,
      userId: uid,
      accountId: PRIMARY_WALLET_ID,
      reference: generateReference('FUND'),
      type: 'credit',
      category: 'funding',
      amountKobo: BRAND.initialFundingKobo,
      currency: BRAND.currencyCode,
      status: 'successful',
      description: 'Welcome bonus',
      narration: 'Initial wallet welcome credit',
      counterpartyName: BRAND.name,
      counterpartyBankName: BRAND.demoBankName,
      balanceAfterKobo: BRAND.initialFundingKobo,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, walletPath);
  }

  return {
    profile: {
      user: {
        id: uid,
        firstName: finalFirstName,
        lastName: finalLastName,
        email,
        phone: finalPhone,
        createdAt: new Date().toISOString(),
      },
      preferences: { hideBalanceByDefault },
    },
    isNewUser: !userSnap.exists(),
  };
}

export function subscribeToUserProfile(
  uid: string,
  onData: (snapshot: UserProfileSnapshot) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        onData(mapUserSnapshot(snap.data() as Record<string, unknown>, uid));
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToWalletAccount(
  uid: string,
  onData: (account: Account | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}/wallets/${PRIMARY_WALLET_ID}`;
  return onSnapshot(
    doc(db, 'users', uid, 'wallets', PRIMARY_WALLET_ID),
    (snap) => {
      if (snap.exists()) {
        onData(mapWalletSnapshot(snap.data() as Record<string, unknown>, PRIMARY_WALLET_ID));
      } else {
        onData(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToTransactions(
  uid: string,
  onData: (transactions: Transaction[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}/transactions`;
  const txQuery = query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid));

  return onSnapshot(
    txQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => mapTransactionSnapshot(docSnap.data() as Record<string, unknown>, docSnap.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function updateUserProfile(
  uid: string,
  input: { firstName: string; lastName: string; phone: string }
): Promise<void> {
  const fieldErrors: Record<string, string> = {};

  const firstErr = validateName(input.firstName, 'First name');
  if (firstErr) fieldErrors.firstName = firstErr;

  const lastErr = validateName(input.lastName, 'Last name');
  if (lastErr) fieldErrors.lastName = lastErr;

  const trimmedPhone = input.phone.trim();
  let normalizedPhone = '';
  if (trimmedPhone.length > 0) {
    const parsedPhone = normalizeNigerianPhone(trimmedPhone);
    if (!parsedPhone || !PHONE_PATTERN.test(parsedPhone)) {
      fieldErrors.phone = 'Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).';
    } else {
      normalizedPhone = parsedPhone;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError({
      code: 'VALIDATION_ERROR',
      message: Object.values(fieldErrors)[0],
      fieldErrors,
      status: 400,
    });
  }

  const cleanFirst = input.firstName.trim().slice(0, MAX_NAME_LENGTH);
  const cleanLast = input.lastName.trim().slice(0, MAX_NAME_LENGTH);
  const accountName = `${cleanFirst} ${cleanLast}`.trim().slice(0, 105);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), {
    firstName: cleanFirst,
    lastName: cleanLast,
    phone: normalizedPhone,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'users', uid, 'wallets', PRIMARY_WALLET_ID), {
    accountName,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function updateUserPreferences(
  uid: string,
  prefs: Partial<UserPreferences>
): Promise<UserPreferences> {
  const hideBalanceByDefault = Boolean(prefs.hideBalanceByDefault);
  const userRef = doc(db, 'users', uid);

  try {
    const batch = writeBatch(db);
    batch.update(userRef, {
      hideBalanceByDefault,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }

  return { hideBalanceByDefault };
}

export async function executeTransfer(
  uid: string,
  input: TransferInput
): Promise<MoneyMovementResult> {
  const fieldErrors: Record<string, string> = {};
  const bank = NIGERIAN_BANKS.find((b) => b.code === input.bankCode);
  if (!bank) {
    fieldErrors.bankCode = 'Please select a valid bank.';
  }

  const acctErr = validateAccountNumber(input.accountNumber);
  if (acctErr) {
    fieldErrors.accountNumber = acctErr;
  }

  const cleanRecipientName = input.accountName.trim().slice(0, MAX_COUNTERPARTY_NAME_LENGTH);
  if (cleanRecipientName.length < 2) {
    fieldErrors.accountName = 'Recipient name must be at least 2 characters.';
  }

  const cleanNarration = input.narration?.trim().slice(0, MAX_NARRATION_LENGTH) ?? '';
  if (cleanNarration) {
    const narrErr = validateNarration(cleanNarration);
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

  if (
    !Number.isSafeInteger(input.amountKobo) ||
    input.amountKobo < MIN_TX_AMOUNT_KOBO ||
    input.amountKobo > MAX_TX_AMOUNT_KOBO
  ) {
    throw new ApiError({
      code: 'INVALID_AMOUNT',
      message: 'Transfer amount must be between ₦1.00 and ₦100,000,000.00.',
      fieldErrors: { amount: 'Enter an amount between ₦1.00 and ₦100,000,000.00.' },
      status: 400,
    });
  }

  const idempKey = sanitizeIdempotencyKey(input.idempotencyKey);
  const walletRef = doc(db, 'users', uid, 'wallets', PRIMARY_WALLET_ID);
  const idempRef = doc(db, 'users', uid, 'idempotency', idempKey);

  try {
    return await runTransaction(db, async (tx) => {
      const [walletSnap, idempSnap] = await Promise.all([tx.get(walletRef), tx.get(idempRef)]);

      if (!walletSnap.exists()) {
        throw new ApiError({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Sender wallet account was not found.',
          status: 404,
        });
      }

      const currentAccount = mapWalletSnapshot(
        walletSnap.data() as Record<string, unknown>,
        PRIMARY_WALLET_ID
      );

      if (idempSnap.exists()) {
        const existingTxId = String(idempSnap.data().transactionId ?? '');
        if (existingTxId) {
          const existingTxSnap = await tx.get(doc(db, 'users', uid, 'transactions', existingTxId));
          if (existingTxSnap.exists()) {
            return {
              transaction: mapTransactionSnapshot(
                existingTxSnap.data() as Record<string, unknown>,
                existingTxId
              ),
              account: currentAccount,
            };
          }
        }
      }

      const trimmedAcctNum = input.accountNumber.trim();
      if (trimmedAcctNum === currentAccount.accountNumber) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'You cannot transfer to your own account number.',
          fieldErrors: { accountNumber: 'You cannot transfer to your own account number.' },
          status: 400,
        });
      }

      if (input.amountKobo > currentAccount.balanceKobo) {
        throw new ApiError({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient balance for this transfer.',
          fieldErrors: { amount: 'Amount exceeds your available balance.' },
          status: 422,
        });
      }

      const newBalanceKobo = currentAccount.balanceKobo - input.amountKobo;
      const txId = generateId('txn');
      const reference = generateReference('TRF');
      const description = `Transfer to ${cleanRecipientName}`.slice(0, MAX_DESCRIPTION_LENGTH);
      const txRef = doc(db, 'users', uid, 'transactions', txId);

      const txPayload: Record<string, unknown> = {
        id: txId,
        userId: uid,
        accountId: PRIMARY_WALLET_ID,
        reference,
        type: 'debit',
        category: 'transfer',
        amountKobo: input.amountKobo,
        currency: currentAccount.currency,
        status: 'successful',
        description,
        counterpartyName: cleanRecipientName,
        counterpartyBankName: bank!.name.slice(0, 80),
        counterpartyAccountNumber: trimmedAcctNum,
        balanceAfterKobo: newBalanceKobo,
        createdAt: serverTimestamp(),
      };

      if (cleanNarration) {
        txPayload.narration = cleanNarration;
      }

      tx.update(walletRef, {
        balanceKobo: newBalanceKobo,
        updatedAt: serverTimestamp(),
      });
      tx.set(txRef, txPayload);
      tx.set(idempRef, {
        key: idempKey,
        userId: uid,
        transactionId: txId,
        createdAt: serverTimestamp(),
      });

      const updatedAccount: Account = {
        ...currentAccount,
        balanceKobo: newBalanceKobo,
      };

      const transaction: Transaction = {
        id: txId,
        accountId: PRIMARY_WALLET_ID,
        reference,
        type: 'debit',
        category: 'transfer',
        amountKobo: input.amountKobo,
        currency: currentAccount.currency,
        status: 'successful',
        description,
        narration: cleanNarration || undefined,
        counterparty: {
          name: cleanRecipientName,
          bankName: bank!.name,
          accountNumber: trimmedAcctNum,
        },
        balanceAfterKobo: newBalanceKobo,
        createdAt: new Date().toISOString(),
      };

      return { transaction, account: updatedAccount };
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/transactions`);
  }
}

export async function executeSimulateIncoming(
  uid: string,
  input: SimulateIncomingInput
): Promise<MoneyMovementResult> {
  const fieldErrors: Record<string, string> = {};
  const cleanSender = input.senderName.trim().slice(0, MAX_COUNTERPARTY_NAME_LENGTH);
  if (cleanSender.length < 2) {
    fieldErrors.senderName = 'Sender name must be at least 2 characters.';
  }

  const cleanNarration = input.narration?.trim().slice(0, MAX_NARRATION_LENGTH) ?? '';
  if (cleanNarration) {
    const narrErr = validateNarration(cleanNarration);
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

  if (
    !Number.isSafeInteger(input.amountKobo) ||
    input.amountKobo < MIN_TX_AMOUNT_KOBO ||
    input.amountKobo > MAX_TX_AMOUNT_KOBO
  ) {
    throw new ApiError({
      code: 'INVALID_AMOUNT',
      message: 'Amount must be between ₦1.00 and ₦100,000,000.00.',
      fieldErrors: { amount: 'Enter an amount between ₦1.00 and ₦100,000,000.00.' },
      status: 400,
    });
  }

  const idempKey = sanitizeIdempotencyKey(input.idempotencyKey);
  const walletRef = doc(db, 'users', uid, 'wallets', PRIMARY_WALLET_ID);
  const idempRef = doc(db, 'users', uid, 'idempotency', idempKey);

  try {
    return await runTransaction(db, async (tx) => {
      const [walletSnap, idempSnap] = await Promise.all([tx.get(walletRef), tx.get(idempRef)]);

      if (!walletSnap.exists()) {
        throw new ApiError({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Wallet account was not found.',
          status: 404,
        });
      }

      const currentAccount = mapWalletSnapshot(
        walletSnap.data() as Record<string, unknown>,
        PRIMARY_WALLET_ID
      );

      if (idempSnap.exists()) {
        const existingTxId = String(idempSnap.data().transactionId ?? '');
        if (existingTxId) {
          const existingTxSnap = await tx.get(doc(db, 'users', uid, 'transactions', existingTxId));
          if (existingTxSnap.exists()) {
            return {
              transaction: mapTransactionSnapshot(
                existingTxSnap.data() as Record<string, unknown>,
                existingTxId
              ),
              account: currentAccount,
            };
          }
        }
      }

      const newBalanceKobo = currentAccount.balanceKobo + input.amountKobo;
      if (newBalanceKobo > MAX_BALANCE_KOBO) {
        throw new ApiError({
          code: 'INVALID_AMOUNT',
          message: 'Wallet balance limit reached.',
          fieldErrors: { amount: 'This credit exceeds the maximum wallet balance.' },
          status: 400,
        });
      }

      const txId = generateId('txn');
      const reference = generateReference('DEP');
      const description = `Incoming payment from ${cleanSender}`.slice(0, MAX_DESCRIPTION_LENGTH);
      const txRef = doc(db, 'users', uid, 'transactions', txId);

      const txPayload: Record<string, unknown> = {
        id: txId,
        userId: uid,
        accountId: PRIMARY_WALLET_ID,
        reference,
        type: 'credit',
        category: 'deposit',
        amountKobo: input.amountKobo,
        currency: currentAccount.currency,
        status: 'successful',
        description,
        counterpartyName: cleanSender,
        counterpartyBankName: 'External Bank',
        balanceAfterKobo: newBalanceKobo,
        createdAt: serverTimestamp(),
      };

      if (cleanNarration) {
        txPayload.narration = cleanNarration;
      }

      tx.update(walletRef, {
        balanceKobo: newBalanceKobo,
        updatedAt: serverTimestamp(),
      });
      tx.set(txRef, txPayload);
      tx.set(idempRef, {
        key: idempKey,
        userId: uid,
        transactionId: txId,
        createdAt: serverTimestamp(),
      });

      const updatedAccount: Account = {
        ...currentAccount,
        balanceKobo: newBalanceKobo,
      };

      const transaction: Transaction = {
        id: txId,
        accountId: PRIMARY_WALLET_ID,
        reference,
        type: 'credit',
        category: 'deposit',
        amountKobo: input.amountKobo,
        currency: currentAccount.currency,
        status: 'successful',
        description,
        narration: cleanNarration || undefined,
        counterparty: {
          name: cleanSender,
          bankName: 'External Bank',
        },
        balanceAfterKobo: newBalanceKobo,
        createdAt: new Date().toISOString(),
      };

      return { transaction, account: updatedAccount };
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/transactions`);
  }
}

export interface AdminRegisteredUserRow {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountNumber: string;
  bankName: string;
  balanceKobo: number;
  createdAt: string;
}

export async function fetchAllRegisteredUsersWithBalances(): Promise<AdminRegisteredUserRow[]> {
  let usersSnap;
  try {
    usersSnap = await getDocs(collection(db, 'users'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }

  const rows = await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      const userData = userDoc.data() as Record<string, unknown>;
      const walletPath = `users/${uid}/wallets/${PRIMARY_WALLET_ID}`;
      let walletData: Record<string, unknown> | null = null;

      try {
        const walletSnap = await getDoc(doc(db, 'users', uid, 'wallets', PRIMARY_WALLET_ID));
        if (walletSnap.exists()) {
          walletData = walletSnap.data() as Record<string, unknown>;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, walletPath);
      }

      return {
        uid,
        firstName: String(userData.firstName ?? ''),
        lastName: String(userData.lastName ?? ''),
        email: String(userData.email ?? ''),
        phone: String(userData.phone ?? ''),
        accountNumber: walletData ? String(walletData.accountNumber ?? '—') : '—',
        bankName: walletData ? String(walletData.bankName ?? BRAND.demoBankName) : BRAND.demoBankName,
        balanceKobo: walletData ? Number(walletData.balanceKobo ?? 0) : 0,
        createdAt: timestampToIso(userData.createdAt),
      };
    })
  );

  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

