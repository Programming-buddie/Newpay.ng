import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { TransactionStatus } from '../../types';

interface BadgeProps {
  status: TransactionStatus;
}

const config: Record<
  TransactionStatus,
  { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  successful: {
    label: 'Successful',
    classes: 'text-credit bg-credit-bg border-emerald-200/80',
    Icon: CheckCircle2,
  },
  pending: {
    label: 'Pending',
    classes: 'text-pending bg-pending-bg border-amber-200/80',
    Icon: Clock,
  },
  failed: {
    label: 'Failed',
    classes: 'text-debit bg-debit-bg border-rose-200/80',
    Icon: XCircle,
  },
};

export function Badge({ status }: BadgeProps) {
  const { label, classes, Icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
