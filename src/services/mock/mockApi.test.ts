import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../types';
import { createMockApi } from './mockApi';
import { DEMO_ACCOUNT_CREDENTIALS } from './seedData';
import { createMemoryStorage } from './storage';

test('register creates user with ₦500.00 balance, 10-digit account, and initial funding tx', async () => {
  const api = createMockApi({ storage: createMemoryStorage(), latencyMs: 0 });
  const session = await api.register({
    firstName: 'Chidi',
    lastName: 'Nwosu',
    email: 'chidi@example.com',
    phone: '08098765432',
    password: 'Password1',
  });

  assert.equal(session.user.phone, '+2348098765432');
  const account = await api.getAccount();
  assert.equal(account.balanceKobo, 50_000);
  assert.match(account.accountNumber, /^\d{10}$/);

  const history = await api.getTransactions();
  assert.equal(history.total, 1);
  assert.equal(history.items[0].type, 'credit');
  assert.equal(history.items[0].amountKobo, 50_000);
  assert.equal(history.items[0].status, 'successful');
});

test('transfer, idempotency, insufficient funds, self-transfer, and incoming simulation preserve ledger integrity', async () => {
  const api = createMockApi({ storage: createMemoryStorage(), latencyMs: 0 });
  await api.login({
    email: DEMO_ACCOUNT_CREDENTIALS.email,
    password: DEMO_ACCOUNT_CREDENTIALS.password,
    remember: true,
  });

  const startAccount = await api.getAccount();
  assert.equal(startAccount.balanceKobo, 50_000); // ₦500.00

  // Send ₦100.00 -> ₦400.00
  const idempKey = 'idemp-transfer-1';
  const sendRes = await api.transfer({
    idempotencyKey: idempKey,
    bankCode: '058',
    accountNumber: '0123456789',
    accountName: 'Tunde Bakare',
    amountKobo: 10_000,
    narration: 'Lunch split',
  });
  assert.equal(sendRes.account.balanceKobo, 40_000);

  // Duplicate idempotencyKey returns original tx without second deduction
  const dupRes = await api.transfer({
    idempotencyKey: idempKey,
    bankCode: '058',
    accountNumber: '0123456789',
    accountName: 'Tunde Bakare',
    amountKobo: 10_000,
  });
  assert.equal(dupRes.transaction.id, sendRes.transaction.id);
  assert.equal((await api.getBalance()).balanceKobo, 40_000);

  // Insufficient funds blocked
  await assert.rejects(
    () =>
      api.transfer({
        idempotencyKey: 'idemp-overdraft',
        bankCode: '058',
        accountNumber: '0123456789',
        accountName: 'Tunde Bakare',
        amountKobo: 40_001,
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'INSUFFICIENT_FUNDS'
  );
  assert.equal((await api.getBalance()).balanceKobo, 40_000);

  // Self-transfer blocked
  await assert.rejects(
    () =>
      api.transfer({
        idempotencyKey: 'idemp-self',
        bankCode: '999001',
        accountNumber: startAccount.accountNumber,
        accountName: startAccount.accountName,
        amountKobo: 500,
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_ERROR'
  );

  // Receive ₦250.00 -> ₦650.00
  const incRes = await api.simulateIncoming({
    idempotencyKey: 'idemp-incoming-1',
    senderName: 'Ngozi Eze',
    amountKobo: 25_000,
    narration: 'Invoice #12',
  });
  assert.equal(incRes.account.balanceKobo, 65_000);

  const txAll = await api.getTransactions();
  assert.equal(txAll.total, 3);
  assert.equal(txAll.items[0].type, 'credit');
  assert.equal(txAll.items[0].amountKobo, 25_000);
  assert.equal(txAll.items[1].type, 'debit');
  assert.equal(txAll.items[1].amountKobo, 10_000);
  assert.equal(txAll.items[2].type, 'credit');
  assert.equal(txAll.items[2].amountKobo, 50_000);

  const txSent = await api.getTransactions({ type: 'debit' });
  assert.equal(txSent.total, 1);
  const txRecv = await api.getTransactions({ type: 'credit' });
  assert.equal(txRecv.total, 2);
});

test('two users maintain strictly isolated balances and transaction histories', async () => {
  const storage = createMemoryStorage();
  const api = createMockApi({ storage, latencyMs: 0 });

  await api.register({
    firstName: 'User',
    lastName: 'One',
    email: 'one@example.com',
    phone: '08011112222',
    password: 'Password1',
  });
  await api.transfer({
    idempotencyKey: 'u1-send',
    bankCode: '044',
    accountNumber: '1122334455',
    accountName: 'Receiver A',
    amountKobo: 20_000,
  });
  assert.equal((await api.getBalance()).balanceKobo, 30_000);
  await api.logout();

  await api.login({
    email: DEMO_ACCOUNT_CREDENTIALS.email,
    password: DEMO_ACCOUNT_CREDENTIALS.password,
    remember: false,
  });
  assert.equal((await api.getBalance()).balanceKobo, 50_000);
  assert.equal((await api.getTransactions()).total, 1);
});
