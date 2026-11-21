import React from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 border border-transparent shadow-xs',
  secondary:
    'bg-surface text-ink border border-line hover:bg-subtle active:bg-line/50',
  ghost:
    'bg-transparent text-muted hover:text-ink hover:bg-subtle border border-transparent',
  danger:
    'bg-debit text-white hover:bg-rose-800 active:bg-rose-900 border border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg',
  md: 'min-h-[44px] px-5 py-2.5 text-sm font-medium rounded-xl',
  lg: 'min-h-[48px] px-6 py-3 text-sm font-semibold rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="text-current" />}
      <span>{children}</span>
    </button>
  );
}
