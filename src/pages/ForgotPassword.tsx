import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { BrandLogo } from '../components/layout/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ENV } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../types';
import { validateEmail } from '../utils/validation';

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const emailErr = validateEmail(email);
    setError(emailErr);
    if (emailErr) return;

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(email);
      setSubmittedMessage(res.message);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to process request right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center px-4 py-10">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/signin"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to sign in</span>
          </Link>
          <BrandLogo size="sm" />
        </div>

        <Card padding="lg">
          <h1 className="text-2xl font-display font-bold text-ink">Account recovery</h1>
          {!ENV.USE_MOCK_API ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-2.5 p-4 rounded-xl bg-subtle/70 border border-line text-sm text-ink leading-relaxed">
                <Info className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                <span>
                  NewPay uses Google Sign-In for authentication. Password resets and account recovery
                  are managed directly through your Google Account security settings.
                </span>
              </div>
              <Link to="/signin" className="block">
                <Button fullWidth>Return to Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                Enter the email address associated with your account to request password reset
                instructions.
              </p>

              {submittedMessage ? (
                <div className="mt-6 p-4 rounded-xl bg-credit-bg border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-credit font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Request recorded</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">{submittedMessage}</p>
                  <div className="pt-2">
                    <Link
                      to="/signin"
                      className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Return to Sign In
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                  <Input
                    label="Account email"
                    type="email"
                    placeholder="adaeze@example.com"
                    value={email}
                    required
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched) setError(validateEmail(e.target.value));
                    }}
                    onBlur={() => {
                      setTouched(true);
                      setError(validateEmail(email));
                    }}
                    error={touched ? error : null}
                  />

                  <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Send reset instructions
                  </Button>
                </form>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
