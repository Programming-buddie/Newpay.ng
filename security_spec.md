# NewPay Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: A `UserProfile` document at `/users/{userId}` can only be read (`get`), created, or updated by the authenticated, email-verified user whose `request.auth.uid == userId`. Collection listing on `/users` is strictly denied.
2. **Wallet Master Gate & Initial Funding Cap**: A `WalletAccount` document at `/users/{userId}/wallets/{walletId}` cannot exist without its parent `/users/{userId}` document (`existsAfter` on create, `exists` on update). On initial creation, `balanceKobo` MUST equal `50000` (₦500.00 welcome bonus), preventing arbitrary client-side balance inflation.
3. **Non-Negative Integer Balance & Immutable Ledger**: `WalletAccount.balanceKobo` is always an integer `>= 0` and `<= 100000000000`. `WalletTransaction` entries at `/users/{userId}/transactions/{transactionId}` are strictly append-only (updates and deletes denied), and `balanceAfterKobo` MUST equal the parent wallet's `balanceKobo` after the atomic batch/transaction commits (`getAfter`).
4. **Temporal & Structural Integrity**: All `createdAt` and `updatedAt` timestamps MUST equal `request.time`. All documents enforce `keys().hasAll(...)` and `keys().hasOnly(...)` to block shadow/ghost fields, and all path IDs match `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
5. **Idempotency Consistency**: Every `IdempotencyRecord` at `/users/{userId}/idempotency/{idempotencyKey}` must reference an existing or atomically created transaction (`existsAfter`) and cannot be overwritten or deleted.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Profile Read**: Anonymous `get` on `/users/user_abc` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` creating `/users/user_abc` -> `PERMISSION_DENIED`.
3. **Cross-User Profile Spoofing**: User A (`uid: user_a`) reading or writing `/users/user_b` -> `PERMISSION_DENIED`.
4. **Users Collection Enumeration**: Any authenticated user attempting `list` on `/users` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: Creating `/users/user_a` with an extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Balance Inflation on Wallet Creation**: Creating `/users/user_a/wallets/primary` with `balanceKobo: 99999999` instead of `50000` -> `PERMISSION_DENIED`.
7. **Negative Balance Overdraft**: Updating `/users/user_a/wallets/primary` to `balanceKobo: -500` -> `PERMISSION_DENIED`.
8. **Immutable Field Tampering**: Updating `/users/user_a/wallets/primary` to change `accountNumber` or `currency` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating a transaction with a backdated `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
10. **Ledger Tampering / Deletion**: Updating or deleting an existing `/users/user_a/transactions/txn_1` -> `PERMISSION_DENIED`.
11. **Orphaned / Desynced Transaction**: Creating a transaction whose `balanceAfterKobo` does not match the wallet's post-commit `balanceKobo` -> `PERMISSION_DENIED`.
12. **Resource Exhaustion / ID Poisoning**: Creating a document with a 500-character ID or a 5,000-character `narration` string -> `PERMISSION_DENIED`.
