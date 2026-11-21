import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastItem } from '../../context/ToastContext';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styleMap = {
  success: 'border-brand-200 bg-surface text-ink',
  error: 'border-rose-200 bg-surface text-ink',
  info: 'border-line bg-surface text-ink',
};

const iconColorMap = {
  success: 'text-credit',
  error: 'text-debit',
  info: 'text-brand-700',
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-md ${styleMap[toast.type]}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColorMap[toast.type]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="min-h-[32px] min-w-[32px] -mr-1 -mt-1 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-subtle cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
