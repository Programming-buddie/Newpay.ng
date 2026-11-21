import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { BRAND } from '../config/brand';
import { ENV } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { DEMO_ACCOUNT_CREDENTIALS } from '../services/mock/seedData';
import { ApiError } from '../types';
import { validateEmail } from '../utils/validation';

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function SignIn() {
  const { login, signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: 'email' | 'password', val: string) => {
    if (field === 'email') {
      const err = validateEmail(val);
      setFieldErrors((prev) => ({ ...prev, email: err ?? '' }));
      return err;
    }
    const err = !val ? 'Password is required.' : null;
    setFieldErrors((prev) => ({ ...prev, password: err ?? '' }));
    return err;
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const { user, isNewUser } = await signInWithGoogle();
      showToast({
        type: 'success',
        title: isNewUser ? `Welcome, ${user.firstName}` : `Welcome back, ${user.firstName}`,
        message: isNewUser
          ? 'Your wallet has been created with a ₦500.00 welcome bonus.'
          : 'You are now signed in to your wallet.',
      });
      navigate(fromPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to sign in with Google right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const performSignIn = async (credentials: {
    email: string;
    password: string;
    remember: boolean;
  }) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const user = await login(credentials);
      showToast({
        type: 'success',
        title: `Welcome back, ${user.firstName}`,
        message: 'You are now signed in to your wallet.',
      });
      navigate(fromPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setFormError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const emailErr = validateField('email', email);
    const passErr = validateField('password', password);
    if (emailErr || passErr) return;

    await performSignIn({ email, password, remember });
  };

  const handleDemoSignIn = async () => {
    setEmail(DEMO_ACCOUNT_CREDENTIALS.email);
    setPassword(DEMO_ACCOUNT_CREDENTIALS.password);
    setFieldErrors({});
    await performSignIn({
      email: DEMO_ACCOUNT_CREDENTIALS.email,
      password: DEMO_ACCOUNT_CREDENTIALS.password,
      remember: true,
    });
  };

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
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">Sign in to {BRAND.name}</h1>
            <p className="mt-1.5 text-sm text-muted">
              Access your Naira wallet balance and transaction history.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mt-5 p-3.5 rounded-xl bg-debit-bg border border-rose-200 text-xs font-medium text-debit"
            >
              {formError}
            </div>
          )}

          {!ENV.USE_MOCK_API ? (
            <div className="mt-6 space-y-5">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                onClick={handleGoogleSignIn}
                className="bg-surface hover:bg-subtle border-line text-ink font-semibold shadow-xs"
              >
                <GoogleMark />
                <span>Continue with Google</span>
              </Button>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-subtle/70 border border-line text-xs text-muted leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                <span>
                  Secured with Firebase Authentication. Your wallet balance and ledger sync
                  automatically across sessions.
                </span>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  placeholder="adaeze@example.com"
                  value={email}
                  required
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) validateField('email', e.target.value);
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, email: true }));
                    validateField('email', email);
                  }}
                  error={touched.email ? fieldErrors.email || null : null}
                />

                <PasswordInput
                  label="Password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  required
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) validateField('password', e.target.value);
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, password: true }));
                    validateField('password', password);
                  }}
                  error={touched.password ? fieldErrors.password || null : null}
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer select-none min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-line text-brand-700 focus:ring-brand-600"
                    />
                    <span>Remember me</span>
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-brand-700 hover:text-brand-800 whitespace-nowrap"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
                  Sign In
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDemoSignIn}
                  className="text-xs text-muted hover:text-ink underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Use demo account
                </button>
              </div>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-muted">
          New to {BRAND.name}?{' '}
          <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-800">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
