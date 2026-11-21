import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAccount } from '../hooks/useAccount';
import { useToast } from '../hooks/useToast';
import { ApiError, Transaction } from '../types';
import { formatDateTime } from '../utils/dates';
import { formatNaira, tryParseKobo } from '../utils/money';
import { validateAccountNumber, validateNarration } from '../utils/validation';

type SendStep = 'details' | 'review' | 'result';

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function Send() {
  const { account, banks, sendTransfer } = useAccount();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<SendStep>('details');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [narration, setNarration] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => createIdempotencyKey());
  const [isProcessing, setIsProcessing] = useState(false);
  const submitLockRef = useRef(false);

  const [resultStatus, setResultStatus] = useState<'success' | 'error'>('success');
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const bankOptions = useMemo(
    () =>
      banks.map((b) => ({
        value: b.code,
        label: b.name,
        secondary: b.code,
      })),
    [banks]
  );

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === bankCode) ?? null,
    [banks, bankCode]
  );

  const parsedAmount = useMemo(() => tryParseKobo(amountInput, 100), [amountInput]);

  const validateField = (
    name: string,
    overrideValue?: string
  ): string | null => {
    let err: string | null = null;

    if (name === 'bankCode') {
      const val = overrideValue ?? bankCode;
      err = val ? null : 'Please select a recipient bank.';
    }
    if (name === 'accountNumber') {
      const val = overrideValue ?? accountNumber;
      err = validateAccountNumber(val);
      if (!err && account && val.trim() === account.accountNumber) {
        err = 'You cannot send money to your own account number.';
      }
    }
    if (name === 'recipientName') {
      const val = (overrideValue ?? recipientName).trim();
      err = val.length >= 2 ? null : 'Enter the recipient name (at least 2 characters).';
    }
    if (name === 'amount') {
      const val = overrideValue ?? amountInput;
      const parsed = tryParseKobo(val, 100);
      if (!parsed.ok) {
        err = parsed.error;
      } else if (account && parsed.kobo > account.balanceKobo) {
        err = `Insufficient funds. Available balance is ${formatNaira(account.balanceKobo)}.`;
      }
    }
    if (name === 'narration') {
      const val = overrideValue ?? narration;
      err = validateNarration(val);
    }

    setFieldErrors((prev) => ({ ...prev, [name]: err ?? '' }));
    return err;
  };

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const fields = ['bankCode', 'accountNumber', 'recipientName', 'amount', 'narration'];
    const nextTouched: Record<string, boolean> = {};
    fields.forEach((f) => {
      nextTouched[f] = true;
    });
    setTouched(nextTouched);

    const errs = fields.map((f) => validateField(f)).filter(Boolean);
    if (errs.length > 0) return;

    setStep('review');
  };

  const handleConfirmTransfer = async () => {
    if (submitLockRef.current || isProcessing || !parsedAmount.ok) return;
    submitLockRef.current = true;
    setIsProcessing(true);

    try {
      const res = await sendTransfer({
        idempotencyKey,
        bankCode,
        accountNumber: accountNumber.trim(),
        accountName: recipientName.trim(),
        amountKobo: parsedAmount.kobo,
        narration: narration.trim() || undefined,
      });

      setCompletedTx(res.transaction);
      setResultStatus('success');
      setResultError(null);
      setStep('result');
      showToast({
        type: 'success',
        title: 'Transfer sent',
        message: `${formatNaira(res.transaction.amountKobo)} sent to ${res.transaction.counterparty.name}.`,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Transfer failed due to an unexpected error.';
      setResultStatus('error');
      setResultError(msg);
      setStep('result');
      showToast({
        type: 'error',
        title: 'Transfer could not be completed',
        message: msg,
      });
    } finally {
      setIsProcessing(false);
      submitLockRef.current = false;
    }
  };

  const resetForAnother = () => {
    setBankCode('');
    setAccountNumber('');
    setRecipientName('');
    setAmountInput('');
    setNarration('');
    setTouched({});
    setFieldErrors({});
    setCompletedTx(null);
    setResultError(null);
    setIdempotencyKey(createIdempotencyKey());
    setStep('details');
  };

  const balanceAfterKobo =
    account && parsedAmount.ok ? account.balanceKobo - parsedAmount.kobo : 0;

  return (
    <DashboardLayout
      title="Send Money"
      subtitle="Transfer Naira from your wallet"
    >
      <div className="max-w-xl mx-auto space-y-5">
        <div
          aria-label="Transfer steps"
          className="flex items-center justify-between text-xs font-medium text-muted px-1"
        >
          <span className={step === 'details' ? 'text-brand-700 font-semibold' : ''}>
            1. Details
          </span>
          <span aria-hidden="true">·</span>
          <span className={step === 'review' ? 'text-brand-700 font-semibold' : ''}>
            2. Review
          </span>
          <span aria-hidden="true">·</span>
          <span className={step === 'result' ? 'text-brand-700 font-semibold' : ''}>
            3. Result
          </span>
        </div>

        {step === 'details' && (
          <Card padding="lg">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <p className="text-xs text-muted">Available balance</p>
                <p className="text-lg font-display font-bold tabular-nums text-ink">
                  {account ? formatNaira(account.balanceKobo) : '₦0.00'}
                </p>
              </div>
              <span className="text-xs text-muted font-mono tabular-nums">
                {account?.accountNumber}
              </span>
            </div>

            <form onSubmit={handleContinueToReview} noValidate className="mt-5 space-y-4">
              <Select
                label="Recipient bank"
                placeholder="Select bank"
                searchPlaceholder="Search bank name (e.g. GTBank, OPay)..."
                options={bankOptions}
                value={bankCode}
                required
                onChange={(val) => {
                  setBankCode(val);
                  setTouched((t) => ({ ...t, bankCode: true }));
                  validateField('bankCode', val);
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, bankCode: true }));
                  validateField('bankCode');
                }}
                error={touched.bankCode ? fieldErrors.bankCode || null : null}
              />

              <Input
                label="Account number"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit account number"
                value={accountNumber}
                required
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setAccountNumber(digitsOnly);
                  if (touched.accountNumber) validateField('accountNumber', digitsOnly);
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, accountNumber: true }));
                  validateField('accountNumber');
                }}
                error={touched.accountNumber ? fieldErrors.accountNumber || null : null}
              />

              <Input
                label="Recipient name"
                placeholder="e.g. Tunde Bakare"
                value={recipientName}
                required
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  if (touched.recipientName) validateField('recipientName', e.target.value);
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, recipientName: true }));
                  validateField('recipientName');
                }}
                error={touched.recipientName ? fieldErrors.recipientName || null : null}
              />

              <Input
                label="Amount"
                prefix="₦"
                inputMode="decimal"
                placeholder="0.00"
                value={amountInput}
                required
                className="font-mono tabular-nums"
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  if (touched.amount) validateField('amount', e.target.value);
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, amount: true }));
                  validateField('amount');
                }}
                error={touched.amount ? fieldErrors.amount || null : null}
              />

              <Input
                label="Narration (optional)"
                maxLength={100}
                placeholder="What is this transfer for?"
                hint={`${narration.length}/100 characters`}
                value={narration}
                onChange={(e) => {
                  setNarration(e.target.value);
                  if (touched.narration) validateField('narration', e.target.value);
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, narration: true }));
                  validateField('narration');
                }}
                error={touched.narration ? fieldErrors.narration || null : null}
              />

              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" fullWidth>
                  Review transfer
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === 'review' && parsedAmount.ok && (
          <Card padding="lg" className="space-y-6">
            <div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setStep('details')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Edit details</span>
              </button>
              <h2 className="mt-3 text-xl font-display font-bold text-ink">
                Review transfer
              </h2>
              <p className="mt-1 text-sm text-muted">
                Confirm the recipient and amount before sending.
              </p>
            </div>

            <div className="py-5 border-t border-b border-line text-center">
              <p className="text-xs text-muted">You are sending</p>
              <p className="mt-1 text-3xl font-display font-bold font-mono tabular-nums text-ink">
                {formatNaira(parsedAmount.kobo)}
              </p>
            </div>

            <dl className="divide-y divide-line text-sm">
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Recipient bank</dt>
                <dd className="font-medium text-ink text-right">{selectedBank?.name}</dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Account number</dt>
                <dd className="font-mono tabular-nums text-ink text-right">
                  {accountNumber}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Recipient name</dt>
                <dd className="font-medium text-ink text-right">{recipientName.trim()}</dd>
              </div>
              {narration.trim() && (
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Narration</dt>
                  <dd className="text-ink text-right">{narration.trim()}</dd>
                </div>
              )}
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Balance after transfer</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink text-right">
                  {formatNaira(balanceAfterKobo)}
                </dd>
              </div>
            </dl>

            <div className="flex items-start gap-2 pt-1 text-xs text-muted">
              <ShieldAlert className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
              <span>Recipient details are not verified.</span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={isProcessing}
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                fullWidth
                isLoading={isProcessing}
                onClick={handleConfirmTransfer}
              >
                Confirm transfer
              </Button>
            </div>
          </Card>
        )}

        {step === 'result' && (
          <Card padding="lg" className="text-center space-y-6">
            {resultStatus === 'success' && completedTx ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-credit-bg text-credit flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-ink">
                    Transfer successful
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Your transfer has been recorded in your ledger.
                  </p>
                </div>

                <div className="py-4 border-t border-b border-line">
                  <p className="text-xs text-muted">Amount sent</p>
                  <p className="mt-1 text-3xl font-display font-bold font-mono tabular-nums text-ink">
                    {formatNaira(completedTx.amountKobo)}
                  </p>
                </div>

                <dl className="divide-y divide-line text-sm text-left">
                  <div className="py-3 flex justify-between gap-4">
                    <dt className="text-muted">Recipient</dt>
                    <dd className="font-medium text-ink text-right">
                      {completedTx.counterparty.name}
                    </dd>
                  </div>
                  <div className="py-3 flex justify-between gap-4">
                    <dt className="text-muted">Bank</dt>
                    <dd className="text-ink text-right">
                      {completedTx.counterparty.bankName}
                    </dd>
                  </div>
                  <div className="py-3 flex justify-between gap-4">
                    <dt className="text-muted">Reference</dt>
                    <dd className="font-mono text-xs text-ink text-right">
                      {completedTx.reference}
                    </dd>
                  </div>
                  <div className="py-3 flex justify-between gap-4">
                    <dt className="text-muted">Date & time</dt>
                    <dd className="text-ink text-right tabular-nums">
                      {formatDateTime(completedTx.createdAt)}
                    </dd>
                  </div>
                  {completedTx.balanceAfterKobo !== undefined && (
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-muted">New balance</dt>
                      <dd className="font-mono font-semibold tabular-nums text-ink text-right">
                        {formatNaira(completedTx.balanceAfterKobo)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button variant="secondary" fullWidth onClick={resetForAnother}>
                    Send another
                  </Button>
                  <Button fullWidth onClick={() => navigate('/dashboard')}>
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-debit-bg text-debit flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-ink">Transfer failed</h2>
                  <p className="mt-2 text-sm text-muted">
                    {resultError ?? 'The transfer could not be processed. No funds were deducted.'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => navigate('/dashboard')}
                  >
                    Back to Dashboard
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => {
                      setIdempotencyKey(createIdempotencyKey());
                      setStep('details');
                    }}
                  >
                    Try again
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
