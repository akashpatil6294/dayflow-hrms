import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  className?: string;
}

// Styled like a physical switch someone actually flips, not a stock icon
// button — a warm daylight track when off, ink-blue at night when on,
// with a knob that slides and turns over.
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle, className }) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2',
        isDark
          ? 'bg-indigo-950 border-indigo-800'
          : 'bg-amber-100 border-amber-300',
        className
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ease-out',
          isDark ? 'translate-x-[19px] rotate-[20deg]' : 'translate-x-0 rotate-0'
        )}
      >
        {isDark ? (
          <Moon className="w-2.5 h-2.5 text-indigo-700" strokeWidth={2.5} />
        ) : (
          <Sun className="w-2.5 h-2.5 text-amber-600" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
};
