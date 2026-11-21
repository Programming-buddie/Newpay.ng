import React, { useRef, useState } from 'react';
import { Check, CheckCircle2, Copy, Info } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAccount } from '../hooks/useAccount';
import { useToast } from '../hooks/useToast';
import { ApiError, Transaction } from '../types';
import { formatNaira, tryParseKobo } from '../utils/money';
import { validateNarration } from '../utils/validation';

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function Receive() {
  const { account, simulateIncoming } = useAccount();
  const { showToast } = useToast();

  const [copied, setCopied] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [narration, setNarration] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSimulatedTx, setLastSimulatedTx] = useState<Transaction | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => createIdempotencyKey());
  const lockRef = useRef(false);

  const handleCopyDetails = async () => {
    if (!account) return;
    const text = `${account.accountName} | ${account.bankName} | ${account.accountNumber}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast({
        type: 'success',
        title: 'Account details copied',
        message: `${account.accountNumber} (${account.bankName}) copied to clipboard.`,
      });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast({
        type: 'info',
        title: 'Copy manually',
        message: `Account number: ${account.accountNumber}`,
      });
    }
  };

  const validateField = (name: string, override?: string): string | null => {
    let err: string | null = null;
    if (name === 'senderName') {
      const val = (override ?? senderName).trim();
      err = val.length >= 2 ? null : 'Enter a sender name (at least 2 characters).';
    }
    if (name === 'amount') {
      const parsed = tryParseKobo(override ?? amountInput, 100);
      err = parsed.ok ? null : parsed.error;
    }
    if (name === 'narration') {
      err = validateNarration(override ?? narration);
    }
    setFieldErrors((prev) => ({ ...prev, [name]: err ?? '' }));
    return err;
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockRef.current || isSubmitting) return;

    const fields = ['senderName', 'amount', 'narration'];
    setTouched({ senderName: true, amount: true, narration: true });
    const errs = fields.map((f) => validateField(f)).filter(Boolean);
    if (errs.length > 0) return;

    const parsed = tryParseKobo(amountInput, 100);
    if (!parsed.ok) return;

    lockRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await simulateIncoming({
        idempotencyKey,
        senderName: senderName.trim(),
        amountKobo: parsed.kobo,
        narration: narration.trim() || undefined,
      });

      setLastSimulatedTx(res.transaction);
      showToast({
        type: 'success',
        title: 'Test funds added',
        message: `${formatNaira(res.transaction.amountKobo)} added from ${res.transaction.counterparty.name}.`,
      });

      setSenderName('');
      setAmountInput('');
      setNarration('');
      setTouched({});
      setFieldErrors({});
      setIdempotencyKey(createIdempotencyKey());
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to add test funds.';
      showToast({ type: 'error', title: 'Unable to add funds', message: msg });
    } finally {
      setIsSubmitting(false);
      lockRef.current = false;
    }
  };

  return (
    <DashboardLayout
      title="Receive Money"
      subtitle="Share your account details to receive payments"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card padding="lg" className="lg:col-span-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-muted">Your receiving account</p>
            <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-ink">
              {account ? formatNaira(account.balanceKobo) : '₦0.00'}
            </p>
            <p className="text-xs text-muted mt-0.5">Current available balance</p>
          </div>

          {account && (
            <dl className="divide-y divide-line border-t border-b border-line text-sm">
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Account holder</dt>
                <dd className="font-medium text-ink text-right">{account.accountName}</dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Bank name</dt>
                <dd className="font-medium text-ink text-right">{account.bankName}</dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-muted">Account number</dt>
                <dd className="font-mono font-semibold tabular-nums text-ink text-right">
                  {account.accountNumber}
                </dd>
              </div>
            </dl>
          )}

          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleCopyDetails}
            disabled={!account}
          >
            {copied ? (
              <span className="inline-flex items-center gap-2 text-credit">
                <Check className="w-4 h-4" />
                <span>Account details copied</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Copy className="w-4 h-4" />
                <span>Copy account details</span>
              </span>
            )}
          </Button>
        </Card>

        <Card padding="lg" className="lg:col-span-7 space-y-5">
          <div>
            <h2 className="text-lg font-display font-bold text-ink">
              Add test funds
            </h2>
            <p className="mt-1 text-sm text-muted">
              Add funds to your wallet and see your balance and history update.
            </p>
          </div>

          <div
            role="note"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-pending-bg border border-amber-200 text-xs text-ink"
          >
            <Info className="w-4 h-4 text-pending shrink-0 mt-0.5" />
            <span>Test credit: this adds funds for testing and is not a bank deposit.</span>
          </div>

          {lastSimulatedTx && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-credit-bg border border-emerald-200 text-xs sm:text-sm"
            >
              <div className="flex items-center gap-2 text-credit font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Added {formatNaira(lastSimulatedTx.amountKobo)} from{' '}
                  {lastSimulatedTx.counterparty.name}
                </span>
              </div>
              <span className="font-mono text-xs text-muted">{lastSimulatedTx.reference}</span>
            </div>
          )}

          <form onSubmit={handleSimulateSubmit} noValidate className="space-y-4">
            <Input
              label="Sender name"
              placeholder="e.g. Ngozi Eze"
              value={senderName}
              required
              onChange={(e) => {
                setSenderName(e.target.value);
                if (touched.senderName) validateField('senderName', e.target.value);
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, senderName: true }));
                validateField('senderName');
              }}
              error={touched.senderName ? fieldErrors.senderName || null : null}
            />

            <Input
              label="Amount"
              prefix="₦"
              inputMode="decimal"
              placeholder="250.00"
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
              placeholder="e.g. Payment for invoice #12"
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

            <Button type="submit" fullWidth isLoading={isSubmitting}>
              Add test funds
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
