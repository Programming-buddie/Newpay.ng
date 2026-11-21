# NewPay Frontend ↔ Backend API Contract

> **Status:** EXPECTED / PROPOSED by the frontend; to be confirmed and adjusted with the backend developer.  
> None of the HTTP endpoints below currently exist in this repository. All client calls currently run against `src/services/mock/mockApi.ts` while `ENV.USE_MOCK_API` is `true`.

---

## 1. Conventions & Authentication

- **Base URL:** Configured via `VITE_API_BASE_URL` (default `http://localhost:8080/api/v1`).
- **Content-Type:** `application/json` for all requests and responses.
- **Authentication:**
  - `POST /auth/register` and `POST /auth/login` return `{ token, user, expiresAt }`.
  - Protected routes expect `Authorization: Bearer <token>`.
  - **401 Handling:** Whenever any endpoint returns HTTP `401 Unauthorized`, `httpRequest()` in `src/services/http/httpApi.ts` clears the stored token, invokes the registered unauthorized handler in `AuthContext`, and redirects the user to `/signin`.
- **Money Format:**
  - **Preferred:** Integer **kobo** (`₦1 = 100 kobo`), e.g. `balanceKobo: 50000` for `₦500.00`.
  - **Accepted fallback:** Decimal Naira (`balance` or `amount` as a number or string) is supported via `parseApiMoneyToKobo()` in `src/services/http/mappers.ts`.
  - **Currency:** Always `"NGN"`.
- **Timestamps:** ISO 8601 UTC strings (e.g. `"2026-11-21T08:41:29.000Z"`).

---

## 2. Proposed Endpoints

### §1 Register (`register`)
- **Purpose:** Create a new user account, provision a Naira wallet (₦500.00 initial balance), and return an active session.
- **Proposed Endpoint:** `POST /auth/register`
- **Request Body:**
```json
{
  "firstName": "Adaeze",
  "lastName": "Okafor",
  "email": "adaeze@example.com",
  "phone": "+2348012345678",
  "password": "Password1"
}
```
- **Success Response (`201 Created`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-11-28T08:41:29.000Z",
  "user": {
    "id": "usr_01J...",
    "firstName": "Adaeze",
    "lastName": "Okafor",
    "email": "adaeze@example.com",
    "phone": "+2348012345678",
    "createdAt": "2026-11-21T08:41:29.000Z"
  }
}
```
- **Possible Errors:** `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS`, `429 RATE_LIMITED`.

---

### §2 Login (`login`)
- **Purpose:** Authenticate an existing user and issue a session token.
- **Proposed Endpoint:** `POST /auth/login`
- **Request Body:**
```json
{
  "email": "adaeze@example.com",
  "password": "Password1",
  "remember": true
}
```
- **Success Response (`200 OK`):** Same `{ token, expiresAt, user }` shape as Register.
- **Possible Errors:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED`.

---

### §3 Logout (`logout`)
- **Purpose:** Invalidate the current session/token server-side.
- **Proposed Endpoint:** `POST /auth/logout` (Authenticated)
- **Success Response:** `204 No Content` (or `200 OK` `{ "ok": true }`).
- **Possible Errors:** `401 UNAUTHORIZED`.

---

### §4 Current User (`getCurrentUser`)
- **Purpose:** Restore the signed-in user profile on page reload.
- **Proposed Endpoint:** `GET /users/me` (Authenticated)
- **Success Response (`200 OK`):**
```json
{
  "id": "usr_01J...",
  "firstName": "Adaeze",
  "lastName": "Okafor",
  "email": "adaeze@example.com",
  "phone": "+2348012345678",
  "createdAt": "2026-11-21T08:41:29.000Z"
}
```
- **Possible Errors:** `401 UNAUTHORIZED`.

---

### §5 Account Details (`getAccount`)
- **Purpose:** Fetch the user's wallet account metadata and current balance.
- **Proposed Endpoint:** `GET /accounts/me` (Authenticated)
- **Success Response (`200 OK`):**
```json
{
  "id": "acc_01J...",
  "userId": "usr_01J...",
  "accountNumber": "2048193052",
  "accountName": "Adaeze Okafor",
  "bankName": "NewPay",
  "currency": "NGN",
  "balanceKobo": 50000
}
```
- **Possible Errors:** `401 UNAUTHORIZED`, `404 ACCOUNT_NOT_FOUND`.

---

### §6 Balance (`getBalance`)
- **Purpose:** Lightweight balance refresh.
- **Proposed Endpoint:** `GET /accounts/me/balance` (Authenticated)
- **Success Response (`200 OK`):**
```json
{
  "balanceKobo": 50000,
  "currency": "NGN"
}
```
- **Possible Errors:** `401 UNAUTHORIZED`, `404 ACCOUNT_NOT_FOUND`.

---

### §7 Send Money / Transfer (`transfer`)
- **Purpose:** Atomically debit the sender's wallet, record a transfer transaction, and dispatch/simulate settlement.
- **Proposed Endpoint:** `POST /transfers` (Authenticated)
- **Idempotency Requirement:** The client generates a UUID `idempotencyKey` per transfer attempt. If the backend receives a repeated `idempotencyKey` from the same user/account, it **must not** deduct funds a second time; instead, it should return the original `{ transaction, account }` result (or `409 DUPLICATE_REQUEST` if in-flight).
- **Request Body:**
```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "bankCode": "058",
  "accountNumber": "0123456789",
  "accountName": "Tunde Bakare",
  "amountKobo": 10000,
  "narration": "Lunch split"
}
```
- **Success Response (`201 Created` or `200 OK`):**
```json
{
  "transaction": {
    "id": "txn_01J...",
    "accountId": "acc_01J...",
    "reference": "NPY-TRF-20261121-481290",
    "type": "debit",
    "category": "transfer",
    "amountKobo": 10000,
    "currency": "NGN",
    "status": "successful",
    "description": "Transfer to Tunde Bakare",
    "narration": "Lunch split",
    "counterparty": {
      "name": "Tunde Bakare",
      "bankName": "Guaranty Trust Bank (GTBank)",
      "accountNumber": "0123456789"
    },
    "balanceAfterKobo": 40000,
    "createdAt": "2026-11-21T08:45:00.000Z"
  },
  "account": {
    "id": "acc_01J...",
    "userId": "usr_01J...",
    "accountNumber": "2048193052",
    "accountName": "Adaeze Okafor",
    "bankName": "NewPay",
    "currency": "NGN",
    "balanceKobo": 40000
  }
}
```
- **Possible Errors:** `400 VALIDATION_ERROR`, `400 INVALID_AMOUNT`, `401 UNAUTHORIZED`, `404 ACCOUNT_NOT_FOUND`, `409 DUPLICATE_REQUEST`, `422 INSUFFICIENT_FUNDS`.

---

### §8 Incoming Payments (`simulateIncoming` — Mock Mode Only)
- **Important Note:** `simulateIncoming` exists **only** for local simulated data mode (`ENV.USE_MOCK_API === true`).
- In production, incoming credits originate from backend payment provider webhooks or interbank NIP notifications—never from a client-triggered credit endpoint.
- The frontend automatically hides the "Add test funds" form on `/receive` and the "Reset local data" card on `/settings` whenever `ENV.USE_MOCK_API` is `false`.

---

### §9 Transaction History (`getTransactions`)
- **Purpose:** Paginated transaction ledger sorted **newest first** (`createdAt DESC`).
- **Proposed Endpoint:** `GET /transactions` (Authenticated)
- **Query Params:**
  - `type`: optional `"debit"` | `"credit"`
  - `page`: optional integer (default `1`)
  - `pageSize`: optional integer (default `50`)
- **Success Response (`200 OK`):**
```json
{
  "items": [
    {
      "id": "txn_01J...",
      "accountId": "acc_01J...",
      "reference": "NPY-TRF-20261121-481290",
      "type": "debit",
      "category": "transfer",
      "amountKobo": 10000,
      "currency": "NGN",
      "status": "successful",
      "description": "Transfer to Tunde Bakare",
      "narration": "Lunch split",
      "counterparty": {
        "name": "Tunde Bakare",
        "bankName": "Guaranty Trust Bank (GTBank)",
        "accountNumber": "0123456789"
      },
      "balanceAfterKobo": 40000,
      "createdAt": "2026-11-21T08:45:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```
- **Possible Errors:** `401 UNAUTHORIZED`.

---

### §10 Banks List (`getBanks`)
- **Purpose:** Supply the authoritative list of supported banks and fintech codes.
- **Proposed Endpoint:** `GET /banks`
- **Success Response (`200 OK`):**
```json
[
  { "code": "044", "name": "Access Bank" },
  { "code": "058", "name": "Guaranty Trust Bank (GTBank)" }
]
```

---

### §11 Password Reset (`requestPasswordReset`)
- **Purpose:** Trigger password reset email/OTP without leaking whether the email exists.
- **Proposed Endpoint:** `POST /auth/forgot-password`
- **Request Body:** `{ "email": "adaeze@example.com" }`
- **Success Response (`200 OK`):** `{ "message": "If an account matches this email, reset instructions have been sent." }`

---

### §12 User Preferences (`getPreferences` / `updatePreferences`)
- **Purpose:** Persist lightweight display settings (optional; can also remain local if preferred).
- **Proposed Endpoints:** `GET /users/me/preferences`, `PATCH /users/me/preferences`
- **Body / Response:** `{ "hideBalanceByDefault": false }`

---

## 3. Standard Error Format & Codes

All non-2xx responses should return JSON matching:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient balance for this transfer.",
    "fieldErrors": {
      "amount": "Amount exceeds your available balance."
    }
  }
}
```

| Error Code | Suggested HTTP Status | Frontend Behaviour |
|---|---|---|
| `VALIDATION_ERROR` | `400` | Displays inline `fieldErrors` on matching inputs and banner message |
| `INVALID_CREDENTIALS` | `401` | Shows friendly invalid email/password alert on Sign In |
| `EMAIL_ALREADY_EXISTS` | `409` | Highlights email field on Sign Up with duplicate-email message |
| `UNAUTHORIZED` | `401` | Clears session token and redirects to `/signin` |
| `INSUFFICIENT_FUNDS` | `422` | Blocks transfer, shows error, leaves balance untouched |
| `INVALID_AMOUNT` | `400` | Rejects amount and shows inline validation error |
| `ACCOUNT_NOT_FOUND` | `404` | Shows friendly missing-account error screen/toast |
| `DUPLICATE_REQUEST` | `409` | Returns original transaction if completed, or informs user request is in progress |
| `RATE_LIMITED` | `429` | Displays friendly cooldown notice |
| `INTERNAL_ERROR` | `500` | Displays friendly retry message (never dumps stack traces) |

---

## 4. Backend Responsibilities

Frontend validation improves user experience and catches typos early, **but it never provides financial or security enforcement**. The backend developer is responsible for:
1. **Authentication & Session Security:** Password hashing (`Argon2id` or `bcrypt`), signed tokens/cookies, token expiry, and rate-limiting login/reset endpoints.
2. **Authorization:** Verifying that the authenticated `userId` owns the source `accountId` on every read and transfer.
3. **Server-Side Input Validation:** Re-validating all amounts, phone numbers, 10-digit account numbers, and narration lengths.
4. **Real Recipient Verification:** Performing live bank account name enquiry (e.g. NIBSS NIP / Paystack / Flutterwave resolve) before executing transfers.
5. **Atomic Balance & Ledger Management:** Wrapping balance debits/credits and transaction inserts inside a single database transaction with row-level locking (`SELECT ... FOR UPDATE` or optimistic version checks) so balances can never go negative.
6. **Idempotency Enforcement:** Persisting `(userId, idempotencyKey)` uniquely in the database to guarantee at-most-once execution under retries or double-clicks.
7. **Audit Logging:** Recording immutable audit trails for auth events, transfers, and webhook credits.

---

## 5. Integration Checklist

- [ ] Confirm base URL and CORS settings for `http://localhost:3000` (and deployed preview URL).
- [ ] Agree on integer `kobo` vs decimal `naira` fields (update `src/services/http/mappers.ts` if needed).
- [ ] Set `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL=...` in `.env.local`.
- [ ] Implement methods in `src/services/http/httpApi.ts` and store/clear `newpay:http_token` on login/register/logout.
- [ ] Verify all journeys end-to-end: Sign Up → Dashboard → Send Money (including insufficient funds & idempotency) → Transaction History → Sign Out → Sign In.
