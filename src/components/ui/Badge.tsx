import React from 'react';
import { cn } from '../../lib/utils.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'present' | 'absent' | 'half_day' | 'leave' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'neutral' | 'admin' | 'employee';
  showDot?: boolean;
}

// Badges read as ink stamps on a ledger page: bordered, set at a slight
// tilt, monospaced and uppercase — the mark a clerk would leave, not a
// UI pill. Tilt direction alternates by semantic charge so the sheet
// doesn't feel uniform, the way real stamps never land identically twice.
export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  showDot = true,
  children,
  style,
  ...props
}) => {
  const styles: Record<string, { bg: string; text: string; border: string; tilt: string }> = {
    present: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-700/60 dark:border-emerald-700/60', tilt: '-1.6deg' },
    approved: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-700/60 dark:border-emerald-700/60', tilt: '-1.6deg' },
    active: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-700/60 dark:border-emerald-700/60', tilt: '-1deg' },
    pending: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-700/60 dark:border-amber-700/60', tilt: '1.4deg' },
    half_day: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-700/60 dark:border-amber-700/60', tilt: '1.4deg' },
    leave: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-800 dark:text-indigo-300', border: 'border-indigo-700/60 dark:border-indigo-700/60', tilt: '-0.8deg' },
    absent: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-700/60 dark:border-rose-700/60', tilt: '2deg' },
    rejected: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-700/60 dark:border-rose-700/60', tilt: '2deg' },
    inactive: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-400/60 dark:border-slate-600/60', tilt: '0deg' },
    neutral: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-400/60 dark:border-slate-600/60', tilt: '0deg' },
    admin: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-700/60 dark:border-purple-700/60', tilt: '-1.2deg' },
    employee: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-700/60 dark:border-blue-700/60', tilt: '1.2deg' }
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span
      className={cn('stamp', current.bg, current.text, current.border, className)}
      style={{ ['--stamp-tilt' as any]: current.tilt, ...style }}
      {...props}
    >
      {showDot && <span className="w-1 h-1 shrink-0" style={{ backgroundColor: 'currentColor' }} />}
      <span>{children}</span>
    </span>
  );
};
