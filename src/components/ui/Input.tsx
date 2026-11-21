import React, { useId } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  error?: string | null;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  prefix,
  suffix,
  id,
  className = '',
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-ink"
      >
        {label}
        {required && <span className="ml-0.5 text-debit" aria-hidden="true">*</span>}
      </label>

      <div
        className={[
          'flex items-center min-h-[44px] rounded-xl bg-surface border transition-colors duration-150',
          error
            ? 'border-debit focus-within:ring-2 focus-within:ring-debit/20'
            : 'border-line focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20',
        ].join(' ')}
      >
        {prefix && (
          <div className="pl-3.5 pr-2 text-sm font-medium text-muted select-none shrink-0">
            {prefix}
          </div>
        )}

        <input
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[
            'w-full min-h-[42px] bg-transparent text-sm text-ink placeholder:text-muted/65 focus:outline-none',
            prefix ? 'pr-3.5' : 'px-3.5',
            suffix ? 'pr-2' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {suffix && <div className="pr-2 shrink-0 flex items-center">{suffix}</div>}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-debit">
          {error}
        </p>
      )}
    </div>
  );
}
