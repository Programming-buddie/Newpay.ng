import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { BRAND } from '../config/brand';
import { ENV } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../types';
import { normalizeNigerianPhone } from '../utils/phone';
import { getPasswordStrength, validateEmail, validateName } from '../utils/validation';

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

export function SignUp() {
  const { register, signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validateSingle = (name: string, overrides?: Partial<Record<string, string | boolean>>) => {
    const fn = (overrides?.firstName as string) ?? firstName;
    const ln = (overrides?.lastName as string) ?? lastName;
    const em = (overrides?.email as string) ?? email;
    const ph = (overrides?.phone as string) ?? phone;
    const pw = (overrides?.password as string) ?? password;
    const cpw = (overrides?.confirmPassword as string) ?? confirmPassword;
    const terms = (overrides?.acceptedTerms as boolean) ?? acceptedTerms;

    let error: string | null = null;
    if (name === 'firstName') error = validateName(fn, 'First name');
    if (name === 'lastName') error = validateName(ln, 'Last name');
    if (name === 'email') error = validateEmail(em);
    if (name === 'phone') {
      error = normalizeNigerianPhone(ph)
        ? null
        : 'Enter a valid phone number (e.g. 08012345678 or +2348012345678).';
    }
    if (name === 'password') {
      const s = getPasswordStrength(pw);
      error = s.meetsPolicy
        ? null
        : 'Password must be at least 8 characters with letters and numbers.';
    }
    if (name === 'confirmPassword') {
      error = cpw === pw && cpw.length > 0 ? null : 'Passwords do not match.';
    }
    if (name === 'terms') {
      error = terms ? null : 'Please accept the terms to continue.';
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error ?? '' }));
    return error;
  };

  const handleGoogleSignUp = async () => {
    setFormError(null);
    setTouched((t) => ({ ...t, terms: true }));
    if (!acceptedTerms) {
      setFieldErrors((prev) => ({ ...prev, terms: 'Please accept the terms to continue.' }));
      return;
    }

    setIsSubmitting(true);
    try {
      const { user, isNewUser } = await signInWithGoogle();
      showToast({
        type: 'success',
        title: isNewUser ? 'Account created' : `Welcome back, ${user.firstName}`,
        message: isNewUser
          ? 'Welcome! Your wallet has been credited with a ₦500.00 welcome bonus.'
          : 'Signed in to your existing wallet.',
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Could not create your account with Google. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const allFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'password',
      'confirmPassword',
      'terms',
    ];
    const nextTouched: Record<string, boolean> = {};
    allFields.forEach((f) => {
      nextTouched[f] = true;
    });
    setTouched(nextTouched);

    const errors = allFields.map((f) => validateSingle(f)).filter(Boolean);
    if (errors.length > 0) return;

    setIsSubmitting(true);
    try {
      const normalized = normalizeNigerianPhone(phone) ?? phone;
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: normalized,
        password,
      });

      showToast({
        type: 'success',
        title: 'Account created',
        message: 'Welcome! Your wallet has been credited with a ₦500.00 welcome bonus.',
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setFormError('Could not create your account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const barColors: Record<number, string> = {
    0: 'bg-line',
    1: 'bg-debit',
    2: 'bg-pending',
    3: 'bg-credit',
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center px-4 py-10">
      <div className="max-w-lg w-full mx-auto space-y-6">
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
            <h1 className="text-2xl font-display font-bold text-ink">Create your {BRAND.name} wallet</h1>
            <p className="mt-1.5 text-sm text-muted">
              Open your wallet with a ₦500.00 welcome bonus and a 10-digit account number.
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
              <ul className="space-y-2.5 p-4 rounded-xl bg-canvas border border-line text-xs sm:text-sm text-ink">
                {[
                  '₦500.00 welcome bonus credited immediately',
                  'Dedicated 10-digit NewPay wallet account number',
                  'Real-time balance and transaction ledger in Firestore',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-1">
                <label className="flex items-start gap-2.5 text-xs sm:text-sm text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      setTouched((t) => ({ ...t, terms: true }));
                      validateSingle('terms', { acceptedTerms: e.target.checked });
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-line text-brand-700 focus:ring-brand-600"
                  />
                  <span>
                    I agree to the {BRAND.name} Terms of Service and Privacy Policy.
                  </span>
                </label>
                {touched.terms && fieldErrors.terms && (
                  <p role="alert" className="text-xs font-medium text-debit">
                    {fieldErrors.terms}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                onClick={handleGoogleSignUp}
                className="bg-surface hover:bg-subtle border-line text-ink font-semibold shadow-xs"
              >
                <GoogleMark />
                <span>Continue with Google</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First name"
                  autoComplete="given-name"
                  placeholder="Adaeze"
                  value={firstName}
                  required
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (touched.firstName) validateSingle('firstName', { firstName: e.target.value });
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, firstName: true }));
                    validateSingle('firstName');
                  }}
                  error={touched.firstName ? fieldErrors.firstName || null : null}
                />

                <Input
                  label="Last name"
                  autoComplete="family-name"
                  placeholder="Okafor"
                  value={lastName}
                  required
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (touched.lastName) validateSingle('lastName', { lastName: e.target.value });
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, lastName: true }));
                    validateSingle('lastName');
                  }}
                  error={touched.lastName ? fieldErrors.lastName || null : null}
                />
              </div>

              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="adaeze@example.com"
                value={email}
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) validateSingle('email', { email: e.target.value });
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, email: true }));
                  validateSingle('email');
                }}
                error={touched.email ? fieldErrors.email || null : null}
              />

              <Input
                label="Phone number"
                type="tel"
                autoComplete="tel"
                placeholder="0801 234 5678"
                hint="Enter an 11-digit local number or +234 format."
                value={phone}
                required
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (touched.phone) validateSingle('phone', { phone: e.target.value });
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, phone: true }));
                  validateSingle('phone');
                }}
                error={touched.phone ? fieldErrors.phone || null : null}
              />

              <div className="space-y-2">
                <PasswordInput
                  label="Password"
                  autoComplete="new-password"
                  placeholder="Min. 8 chars with letters & numbers"
                  value={password}
                  required
                  onChange={(e) => {
                    const val = e.target.value;
                    setPassword(val);
                    if (touched.password) validateSingle('password', { password: val });
                    if (touched.confirmPassword)
                      validateSingle('confirmPassword', { password: val });
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, password: true }));
                    validateSingle('password');
                  }}
                  error={touched.password ? fieldErrors.password || null : null}
                />

                {password.length > 0 && (
                  <div className="space-y-1.5" aria-live="polite">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            strength.score >= step ? barColors[strength.score] : 'bg-line'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">
                        Password strength:{' '}
                        <strong className="text-ink font-semibold">{strength.label}</strong>
                      </span>
                      {!strength.meetsPolicy && (
                        <span className="text-muted">{strength.issues[0]}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <PasswordInput
                label="Confirm password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                required
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (touched.confirmPassword)
                    validateSingle('confirmPassword', { confirmPassword: e.target.value });
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, confirmPassword: true }));
                  validateSingle('confirmPassword');
                }}
                error={touched.confirmPassword ? fieldErrors.confirmPassword || null : null}
              />

              <div className="pt-1 space-y-1">
                <label className="flex items-start gap-2.5 text-xs sm:text-sm text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      setTouched((t) => ({ ...t, terms: true }));
                      validateSingle('terms', { acceptedTerms: e.target.checked });
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-line text-brand-700 focus:ring-brand-600"
                  />
                  <span>
                    I agree to the {BRAND.name} Terms of Service and Privacy Policy.
                  </span>
                </label>
                {touched.terms && fieldErrors.terms && (
                  <p role="alert" className="text-xs font-medium text-debit">
                    {fieldErrors.terms}
                  </p>
                )}
              </div>

              <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
                Create Account
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/signin" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
