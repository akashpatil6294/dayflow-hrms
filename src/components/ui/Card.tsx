import React from 'react';
import { cn } from '../../lib/utils.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default:
      'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs',
    subtle:
      'bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60',
    elevated:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md'
  };

  return (
    <div
      className={cn(
        'rounded-xl p-5 transition-colors border-t-2 border-t-slate-300 dark:border-t-slate-700',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
