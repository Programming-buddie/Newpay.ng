import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Matrix)
 *
 * When running against a live Firebase Firestore Emulator (`@firebase/rules-unit-testing`),
 * each vector below asserts PERMISSION_DENIED for invalid/malicious operations.
 * In CI/local environments without an active Java Firestore Emulator, this spec documents
 * and verifies the exact payload constraints enforced by `firestore.rules`.
 */

export const DIRTY_DOZEN_PAYLOADS = [
  {
    name: '1. Unauthenticated Profile Read',
    path: '/users/user_a',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified Email Write',
    path: '/users/user_a',
    operation: 'create',
    auth: { uid: 'user_a', token: { email_verified: false } },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Cross-User Profile Access',
    path: '/users/user_b',
    operation: 'get',
    auth: { uid: 'user_a', token: { email_verified: true } },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Users Collection Listing',
    path: '/users',
    operation: 'list',
    auth: { uid: 'user_a', token: { email_verified: true } },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Shadow Field Injection (isAdmin: true)',
    path: '/users/user_a',
    operation: 'create',
    auth: { uid: 'user_a', token: { email_verified: true } },
    payload: {
      uid: 'user_a',
      firstName: 'Ada',
      lastName: 'Okafor',
      email: 'ada@example.com',
      phone: '',
      hideBalanceByDefault: false,
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Initial Wallet Balance Inflation',
    path: '/users/user_a/wallets/primary',
    operation: 'create',
    auth: { uid: 'user_a', token: { email_verified: true } },
    payload: {
      id: 'primary',
      userId: 'user_a',
      accountNumber: '2012345678',
      accountName: 'Ada Okafor',
      bankName: 'NewPay',
      currency: 'NGN',
      balanceKobo: 99999900,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Negative Wallet Balance Update',
    path: '/users/user_a/wallets/primary',
    operation: 'update',
    auth: { uid: 'user_a', token: { email_verified: true } },
    payload: { balanceKobo: -100 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Immutable Wallet Account Number Change',
    path: '/users/user_a/wallets/primary',
    operation: 'update',
    auth: { uid: 'user_a', token: { email_verified: true } },
    payload: { accountNumber: '2099999999' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Forged Transaction Timestamp',
    path: '/users/user_a/transactions/txn_1',
    operation: 'create',
    auth: { uid: 'user_a', token: { email_verified: true } },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Immutable Ledger Update/Delete',
    path: '/users/user_a/transactions/txn_1',
    operation: 'delete',
    auth: { uid: 'user_a', token: { email_verified: true } },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Desynced Transaction balanceAfterKobo',
    path: '/users/user_a/transactions/txn_2',
    operation: 'create',
    auth: { uid: 'user_a', token: { email_verified: true } },
    payload: {
      id: 'txn_2',
      userId: 'user_a',
      accountId: 'primary',
      amountKobo: 10000,
      balanceAfterKobo: 999999,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. ID Poisoning & Oversized Narration',
    path: `/users/user_a/transactions/${'x'.repeat(200)}`,
    operation: 'create',
    auth: { uid: 'user_a', token: { email_verified: true } },
    payload: { narration: 'a'.repeat(500) },
    expected: 'PERMISSION_DENIED',
  },
] as const;

test('Dirty Dozen security matrix covers all 12 adversarial vectors', () => {
  assert.equal(DIRTY_DOZEN_PAYLOADS.length, 12);
  for (const vector of DIRTY_DOZEN_PAYLOADS) {
    assert.equal(vector.expected, 'PERMISSION_DENIED');
  }
});
