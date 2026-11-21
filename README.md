# NewPay — Digital Wallet Frontend

NewPay is a responsive, frontend Naira (`NGN`) digital wallet application. It provides account onboarding, balance privacy, bank transfers with review and idempotency protection, test incoming payments, and a full transaction ledger—while keeping all data access isolated behind a clean service interface for backend integration.

---

## 1. Getting Started

### Prerequisites
- Node.js 20+
- npm

### Run Locally
```bash
npm install
npm run dev
```
The app runs at `http://localhost:3000`.

### Run Unit Tests & Typechecks
```bash
# Pure logic, kobo math, phone normalization, and mock service tests
npx --yes tsx --test src/utils/money.test.ts src/utils/phone.test.ts src/services/mock/mockApi.test.ts

# TypeScript check and production build
npm run lint
npm run build
```

### Pre-Seeded Test Account
On the **Sign In** (`/signin`) page, click **Use demo account** or sign in with:
- **Email:** `demo@newpay.app`
- **Password:** `DemoUser1`
- **Starting Balance:** `₦500.00` (with 1 initial welcome bonus transaction)

---

## 2. Project Structure

```text
src/
  config/
    brand.ts              # Single source of truth for brand name ("NewPay"), currency, initial funding
    env.ts                # Feature flags: USE_MOCK_API, API_BASE_URL
  types/
    index.ts              # User, Account, Transaction, Session, Bank, ApiError, request/response DTOs
  services/
    api.interface.ts      # WalletApiService contract implemented by both mockApi and httpApi
    index.ts              # Exports walletApi based on ENV.USE_MOCK_API
    mock/
      mockApi.ts          # localStorage-backed implementation with simulated latency & atomic updates
      seedData.ts         # Pre-seeded test user (demo@newpay.app)
      banks.ts            # 27 supported banks & fintechs (bank codes; backend supplies authoritative list)
      storage.ts          # Versioned ("newpay:v1") per-user localStorage helper
    http/
      httpApi.ts          # Documented fetch stub (throws "Not implemented: connect backend here")
      mappers.ts          # fromApi / toApi adapters (supports integer kobo or decimal naira)
  context/
    AuthContext.tsx       # Session & auth state (calls service layer only)
    AccountContext.tsx    # Balance, transactions, banks, preferences (calls service layer only)
    ToastContext.tsx      # Global toast notifications
  hooks/
    useAuth.ts
    useAccount.ts
    useTransactions.ts
    useToast.ts
  utils/
    money.ts              # toKobo(), fromKobo(), formatNaira(), formatSignedNaira()
    phone.ts              # Phone normalization (080/081/070/090/091 -> +234...)
    validation.ts         # Email, name, account number, narration, password strength
    dates.ts              # en-NG date/time formatting and time-of-day greetings
  components/
    ui/                   # Button, Input, PasswordInput, Select, Modal, Toast, Badge, Card, Spinner, EmptyState
    layout/               # Navbar, Footer, DashboardLayout, Sidebar, MobileBottomNav, BrandLogo
    dashboard/            # BalanceCard, QuickActions, TransactionList, TransactionItem
  pages/                  # Landing, SignIn, SignUp, ForgotPassword, Dashboard, Send, Receive, Transactions, Profile, Settings, NotFound
```

---

## 3. Switching Between Mock Mode and Real Backend

The frontend reads its data source from `src/config/env.ts` via `src/services/index.ts`:

```ts
export const walletApi: WalletApiService = ENV.USE_MOCK_API ? mockApi : httpApi;
```

By default, `VITE_USE_MOCK_API` defaults to `true`, routing every call to `mockApi`.

### How the Backend Developer Connects Their API
1. **Review the contract**: Agree on endpoints, JSON payloads, and error codes in [`API_CONTRACT.md`](./API_CONTRACT.md).
2. **Configure environment variables** (e.g. `.env.local`):
   ```env
   VITE_USE_MOCK_API=false
   VITE_API_BASE_URL=https://your-backend-url.example/api/v1
   ```
3. **Implement HTTP methods** in `src/services/http/httpApi.ts`:
   - Each method has a `TODO` pointing to the corresponding section in `API_CONTRACT.md`.
   - Use the shared `httpRequest()` helper, which automatically attaches `Authorization: Bearer <token>`, parses `{ error: { code, message, fieldErrors } }` into `ApiError`, and triggers session cleanup on HTTP `401`.
4. **Adjust field or money mappings** in `src/services/http/mappers.ts`:
   - UI components never call `fetch` or read `localStorage` directly—updating `httpApi.ts` and `mappers.ts` connects the entire app without touching UI pages.
5. **Local-only Receive & Reset controls**:
   - The "Add test funds" form on `/receive` and the "Reset local data" card on `/settings` are gated on `ENV.USE_MOCK_API` and automatically hide when connected to the real backend.

---

## 4. Kobo Money Convention

All monetary amounts in state, calculations, and services are stored as **integer kobo** (`₦1 = 100 kobo`) to eliminate IEEE-754 floating-point drift (for example, `0.1 + 0.2 !== 0.3`).

- **Input boundary (`toKobo` in `src/utils/money.ts`)**: Parses the user-typed Naira string directly into integer kobo without `parseFloat(x) * 100`, rejecting more than 2 decimal places, non-numeric text, and zero/negative values.
- **Display boundary (`formatNaira` in `src/utils/money.ts`)**: Formats integer kobo using one shared `Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" })` instance (e.g. `₦1,250.00`).
- **Backend flexibility**: `src/services/http/mappers.ts` accepts either integer kobo (`balanceKobo`, `amountKobo`) or decimal Naira (`balance`, `amount`) from the API.

---

## 5. Current Simulated Mode & Security Notes

- **Simulated data persistence**: In mock mode (`USE_MOCK_API = true`), users, accounts, balances, and transactions use simulated data stored in browser `localStorage` under key `newpay:v1` with per-user isolation and minimal non-secure obfuscation for local credentials. **`localStorage` is NOT a real authentication or ledger system.**
- **No real money or bank verification**: Recipient account numbers and names are not verified against NIBSS/NIP, and all transfers/deposits in mock mode are purely simulated.
- **Backend security**: Real password hashing, JWT/session signing, authorization, atomic database transactions, idempotency enforcement, and payment rail integration must be enforced server-side.
