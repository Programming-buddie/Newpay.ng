import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import {
  ArrowLeft,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Spinner } from '../components/ui/Spinner';
import { auth, googleProvider } from '../firebase';
import { useToast } from '../hooks/useToast';
import {
  AdminRegisteredUserRow,
  fetchAllRegisteredUsersWithBalances,
} from '../services/firebase/firebaseWalletService';
import { formatDateTime } from '../utils/dates';
import { formatNaira } from '../utils/money';
import { formatPhoneDisplay } from '../utils/phone';

const ADMIN_EMAIL = 'alamutuolasunkanmi@gmail.com';

type AdminMode = 'loading' | 'setup-required' | 'env' | 'claimed';

export function Admin() {
  const { showToast } = useToast();

  // Server-verified admin session token kept strictly in React memory (never localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [mode, setMode] = useState<AdminMode>('loading');

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  const [users, setUsers] = useState<AdminRegisteredUserRow[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/status');
        if (!res.ok) throw new Error('Unable to check admin status.');
        const data = (await res.json()) as { configured: boolean; mode: AdminMode };
        if (active) {
          setMode(data.mode);
        }
      } catch {
        if (active) {
          setMode('claimed');
          setAuthError('Could not reach admin authentication service.');
        }
      }
    })();

    const unsub = onAuthStateChanged(auth, (user) => {
      if (active) {
        setFirebaseUser(user);
        setIsFirebaseAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const isFirebaseAdminVerified = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === ADMIN_EMAIL
  );

  const loadRegisteredUsers = useCallback(async () => {
    if (!adminToken || !isFirebaseAdminVerified) return;
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const rows = await fetchAllRegisteredUsersWithBalances();
      setUsers(rows);
    } catch (err) {
      setUsersError(
        err instanceof Error
          ? err.message
          : 'Unable to load registered users from Firestore.'
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, [adminToken, isFirebaseAdminVerified]);

  useEffect(() => {
    if (adminToken && isFirebaseAuthReady && isFirebaseAdminVerified) {
      loadRegisteredUsers();
    }
  }, [adminToken, isFirebaseAuthReady, isFirebaseAdminVerified, loadRegisteredUsers]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const trimmedUser = usernameInput.trim();
    if (!trimmedUser || !passwordInput) {
      setAuthError('Please enter both username and password.');
      return;
    }

    setIsSubmittingAuth(true);
    const endpoint = mode === 'setup-required' ? '/api/admin/claim' : '/api/admin/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUser,
          password: passwordInput,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        username?: string;
        message?: string;
      };
      if (!res.ok || !data.token) {
        setAuthError(data.message || 'Authentication failed.');
        return;
      }

      setAdminToken(data.token);
      setAdminUsername(data.username ?? trimmedUser);
      setPasswordInput('');
      if (mode === 'setup-required') {
        setMode('claimed');
      }
      showToast({
        type: 'success',
        title: 'Admin access granted',
        message: `Signed in as ${data.username ?? trimmedUser}.`,
      });
    } catch {
      setAuthError('Network error while verifying admin credentials.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setUsersError(null);
    setIsSigningInGoogle(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setUsersError(
        err instanceof Error
          ? err.message
          : 'Unable to complete Google verification.'
      );
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleAdminLogout = async () => {
    const token = adminToken;
    setAdminToken(null);
    setAdminUsername(null);
    setUsers([]);
    setUsernameInput('');
    setPasswordInput('');
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    showToast({ type: 'info', title: 'Signed out of Admin' });
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.accountNumber.includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  const totalBalanceKobo = useMemo(
    () => users.reduce((sum, u) => sum + u.balanceKobo, 0),
    [users]
  );

  const averageBalanceKobo = useMemo(
    () => (users.length > 0 ? Math.round(totalBalanceKobo / users.length) : 0),
    [totalBalanceKobo, users.length]
  );

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs font-medium text-muted">Loading admin portal…</p>
        </div>
      </div>
    );
  }

  if (!adminToken) {
    const isSetup = mode === 'setup-required';
    return (
      <div className="min-h-screen bg-canvas flex flex-col justify-center px-4 py-10">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </Link>
            <BrandLogo size="sm" />
          </div>

          <Card padding="lg">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-ink">
                  {isSetup ? 'Set up Admin Portal' : 'Admin Sign In'}
                </h1>
                <p className="text-xs text-muted">
                  {isSetup
                    ? 'Claim your server-hashed admin username and password.'
                    : 'Sign in to view registered accounts and wallet balances.'}
                </p>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="mt-5 p-3.5 rounded-xl bg-debit-bg border border-rose-200 text-xs font-medium text-debit"
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} noValidate className="mt-6 space-y-4">
              <Input
                label="Username"
                autoComplete="username"
                placeholder="Enter admin username"
                value={usernameInput}
                required
                onChange={(e) => setUsernameInput(e.target.value)}
              />

              <PasswordInput
                label="Password"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                placeholder="Enter admin password"
                value={passwordInput}
                required
                onChange={(e) => setPasswordInput(e.target.value)}
              />

              <Button type="submit" fullWidth size="lg" isLoading={isSubmittingAuth}>
                {isSetup ? 'Save Credentials & Enter' : 'Sign In to Admin'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="shrink-0">
              <BrandLogo size="sm" />
            </Link>
            <span className="text-line">/</span>
            <span className="text-sm font-semibold text-ink truncate">
              Admin Portal ({adminUsername})
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex min-h-[38px] px-3 py-1.5 rounded-xl border border-line bg-canvas hover:bg-subtle text-xs font-medium text-ink items-center"
            >
              Wallet App
            </Link>
            <Button type="button" variant="secondary" size="sm" onClick={handleAdminLogout}>
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">
              Registered Users & Wallet Balances
            </h1>
            <p className="mt-1 text-sm text-muted">
              Live directory from Cloud Firestore showing every registered account holder and current Naira balance.
            </p>
          </div>

          {isFirebaseAdminVerified && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isLoadingUsers}
              onClick={loadRegisteredUsers}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          )}
        </div>

        {!isFirebaseAdminVerified ? (
          <Card padding="lg" className="max-w-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Verify Firebase Admin Session
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  Firestore security rules restrict reading all registered users and balances to the
                  verified project owner account (<span className="font-mono text-ink">{ADMIN_EMAIL}</span>).
                </p>
                {firebaseUser && firebaseUser.email?.toLowerCase() !== ADMIN_EMAIL && (
                  <p className="mt-2 text-xs font-medium text-debit">
                    Currently signed in as {firebaseUser.email}. Please switch to {ADMIN_EMAIL}.
                  </p>
                )}
              </div>
            </div>

            {usersError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-debit-bg border border-rose-200 text-xs text-debit"
              >
                {usersError}
              </div>
            )}

            <div>
              <Button
                type="button"
                isLoading={isSigningInGoogle}
                onClick={handleGoogleAdminSignIn}
              >
                {firebaseUser ? 'Switch Google Account' : 'Verify with Google'}
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card padding="md" className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Registered users</span>
                  <Users className="w-4 h-4 text-brand-700" />
                </div>
                <p className="text-2xl font-display font-bold tabular-nums text-ink">
                  {users.length}
                </p>
              </Card>

              <Card padding="md" className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Total wallet balances</span>
                  <Wallet className="w-4 h-4 text-brand-700" />
                </div>
                <p className="text-2xl font-display font-bold font-mono tabular-nums text-ink">
                  {formatNaira(totalBalanceKobo)}
                </p>
              </Card>

              <Card padding="md" className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Average balance</span>
                  <Wallet className="w-4 h-4 text-muted" />
                </div>
                <p className="text-2xl font-display font-bold font-mono tabular-nums text-ink">
                  {formatNaira(averageBalanceKobo)}
                </p>
              </Card>
            </div>

            {usersError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-debit-bg border border-rose-200 text-xs font-medium text-debit"
              >
                {usersError}
              </div>
            )}

            <Card padding="none">
              <div className="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, account..."
                    aria-label="Search registered users"
                    className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <p className="text-xs text-muted tabular-nums">
                  Showing {filteredUsers.length} of {users.length}{' '}
                  {users.length === 1 ? 'account' : 'accounts'}
                </p>
              </div>

              {isLoadingUsers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Spinner />
                  <p className="text-xs text-muted">Loading registered accounts…</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 px-6 text-center text-sm text-muted">
                  {users.length === 0
                    ? 'No registered users found yet.'
                    : 'No registered users match your search.'}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-line bg-subtle/50 text-xs font-semibold text-muted">
                          <th className="py-3 px-5">User</th>
                          <th className="py-3 px-4">Phone</th>
                          <th className="py-3 px-4">Account Number</th>
                          <th className="py-3 px-4">Registered</th>
                          <th className="py-3 px-5 text-right">Account Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredUsers.map((row) => (
                          <tr key={row.uid} className="hover:bg-canvas/70 transition-colors">
                            <td className="py-3.5 px-5">
                              <p className="font-semibold text-ink">
                                {row.firstName} {row.lastName}
                              </p>
                              <p className="text-xs text-muted">{row.email}</p>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-ink">
                              {row.phone ? formatPhoneDisplay(row.phone) : 'Not set'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs font-medium tabular-nums text-ink">
                              {row.accountNumber}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-muted tabular-nums">
                              {formatDateTime(row.createdAt)}
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums text-ink">
                              {formatNaira(row.balanceKobo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="md:hidden divide-y divide-line">
                    {filteredUsers.map((row) => (
                      <div key={row.uid} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate">
                              {row.firstName} {row.lastName}
                            </p>
                            <p className="text-xs text-muted truncate">{row.email}</p>
                          </div>
                          <p className="font-mono font-semibold tabular-nums text-ink shrink-0">
                            {formatNaira(row.balanceKobo)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted pt-1">
                          <span className="font-mono tabular-nums">
                            Acct: {row.accountNumber}
                          </span>
                          <span className="tabular-nums">{formatDateTime(row.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
