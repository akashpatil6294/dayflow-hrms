import React from 'react';
import { cn } from '../../lib/utils.js';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold uppercase tracking-wide rounded-md transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none';

    const variants = {
      primary:
        'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 dark:bg-emerald-700 dark:text-white dark:hover:bg-emerald-600 shadow-[0_1px_0_rgba(0,0,0,0.15)]',
      secondary:
        'bg-slate-100 text-slate-900 border border-slate-300 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700',
      outline:
        'border border-slate-400 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 normal-case tracking-normal font-medium',
      danger:
        'bg-rose-700 text-white hover:bg-rose-600 active:bg-rose-800 shadow-[0_1px_0_rgba(0,0,0,0.15)]',
      success:
        'bg-emerald-700 text-white hover:bg-emerald-600 active:bg-emerald-800 shadow-[0_1px_0_rgba(0,0,0,0.15)]'
    };

    const sizes = {
      sm: 'text-[0.7rem] px-3 py-1.5 gap-1.5 min-h-[32px]',
      md: 'text-xs px-4 py-2 gap-2 min-h-[40px]',
      lg: 'text-sm px-5 py-2.5 gap-2.5 min-h-[46px]'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
