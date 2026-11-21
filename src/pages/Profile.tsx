import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Pencil, Settings } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ENV } from '../config/env';
import { useAccount } from '../hooks/useAccount';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../types';
import { formatDate } from '../utils/dates';
import { formatNaira } from '../utils/money';
import { formatPhoneDisplay, normalizeNigerianPhone } from '../utils/phone';
import { validateName } from '../utils/validation';

export function Profile() {
  const { user, updateProfile } = useAuth();
  const { account } = useAccount();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyAccount = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const startEditing = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setFieldErrors({});
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const fnErr = validateName(firstName, 'First name');
    if (fnErr) errs.firstName = fnErr;
    const lnErr = validateName(lastName, 'Last name');
    if (lnErr) errs.lastName = lnErr;

    const trimmedPhone = phone.trim();
    if (trimmedPhone.length > 0 && !normalizeNigerianPhone(trimmedPhone)) {
      errs.phone = 'Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).';
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: trimmedPhone,
      });
      setIsEditing(false);
      showToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your personal details have been saved.',
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not save profile changes.';
      showToast({ type: 'error', title: 'Update failed', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Profile"
      subtitle="Personal details and wallet account summary"
      action={
        <Link
          to="/settings"
          className="hidden lg:inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-line bg-surface hover:bg-subtle text-sm font-medium text-ink transition-colors"
        >
          <Settings className="w-4 h-4 text-muted" />
          <span>Settings</span>
        </Link>
      }
    >
      <div className="max-w-2xl space-y-6">
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-700 text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
                {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
                {user?.lastName?.[0]?.toUpperCase() ?? ''}
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-ink">
                  {user ? `${user.firstName} ${user.lastName}` : 'Account Holder'}
                </h2>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="sm:text-right">
                <p className="text-xs text-muted">Current balance</p>
                <p className="text-xl font-display font-bold font-mono tabular-nums text-ink">
                  {account ? formatNaira(account.balanceKobo) : '₦0.00'}
                </p>
              </div>
              {!ENV.USE_MOCK_API && !isEditing && (
                <Button type="button" variant="secondary" size="sm" onClick={startEditing}>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
              )}
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} noValidate className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First name"
                  maxLength={50}
                  value={firstName}
                  required
                  onChange={(e) => setFirstName(e.target.value)}
                  error={fieldErrors.firstName || null}
                />
                <Input
                  label="Last name"
                  maxLength={50}
                  value={lastName}
                  required
                  onChange={(e) => setLastName(e.target.value)}
                  error={fieldErrors.lastName || null}
                />
              </div>

              <Input
                label="Phone number (optional)"
                type="tel"
                placeholder="0801 234 5678"
                hint="Enter an 11-digit local number or +234 format."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={fieldErrors.phone || null}
              />

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={isSaving}
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" fullWidth isLoading={isSaving}>
                  Save changes
                </Button>
              </div>
            </form>
          ) : (
            <dl className="divide-y divide-line text-sm mt-2">
              <div className="py-3.5 flex justify-between gap-4">
                <dt className="text-muted">Full name</dt>
                <dd className="font-medium text-ink text-right">
                  {user ? `${user.firstName} ${user.lastName}` : '—'}
                </dd>
              </div>
              <div className="py-3.5 flex justify-between gap-4">
                <dt className="text-muted">Email address</dt>
                <dd className="font-medium text-ink text-right">{user?.email ?? '—'}</dd>
              </div>
              <div className="py-3.5 flex justify-between items-center gap-4">
                <dt className="text-muted">Phone number</dt>
                <dd className="font-mono tabular-nums text-ink text-right">
                  {user?.phone ? (
                    formatPhoneDisplay(user.phone)
                  ) : (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="font-sans text-xs font-medium text-brand-700 hover:text-brand-800 underline underline-offset-4 cursor-pointer"
                    >
                      Add phone number
                    </button>
                  )}
                </dd>
              </div>
              <div className="py-3.5 flex justify-between items-center gap-4">
                <dt className="text-muted">Account number</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono font-semibold tabular-nums text-ink">
                    {account?.accountNumber ?? '—'}
                  </span>
                  {account && (
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      aria-label="Copy account number"
                      className="min-h-[32px] px-2.5 rounded-lg border border-line bg-canvas hover:bg-subtle text-xs font-medium text-ink inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-credit" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </dd>
              </div>
              <div className="py-3.5 flex justify-between gap-4">
                <dt className="text-muted">Bank name</dt>
                <dd className="font-medium text-ink text-right">
                  {account?.bankName ?? 'NewPay'}
                </dd>
              </div>
              <div className="py-3.5 flex justify-between gap-4">
                <dt className="text-muted">Account created</dt>
                <dd className="text-ink text-right">
                  {user ? formatDate(user.createdAt) : '—'}
                </dd>
              </div>
            </dl>
          )}
        </Card>

        <div className="lg:hidden">
          <Link to="/settings">
            <Button variant="secondary" fullWidth>
              Open Settings
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
