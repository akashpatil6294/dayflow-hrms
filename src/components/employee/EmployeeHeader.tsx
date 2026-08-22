import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { NotificationBell } from '../shared/NotificationBell.js';
import { Logo } from '../shared/Logo.js';
import {
  LayoutDashboard,
  CalendarCheck,
  Plane,
  Receipt,
  User,
  LogOut,
  ArrowLeft,
  Clock,
  Sparkles
} from 'lucide-react';

export type EmployeeTab = 'dashboard' | 'attendance' | 'leave' | 'payroll' | 'profile';

interface EmployeeHeaderProps {
  currentTab: EmployeeTab;
  onTabChange: (tab: EmployeeTab) => void;
  isCheckedIn: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  checkInLoading: boolean;
  elapsedSeconds: number;
}

export const EmployeeHeader: React.FC<EmployeeHeaderProps> = ({
  currentTab,
  onTabChange,
  isCheckedIn,
  onCheckIn,
  onCheckOut,
  checkInLoading,
  elapsedSeconds
}) => {
  const { user, profile, effectiveRole, viewingAsEmployee, setViewAsEmployee, signOut, theme, toggleTheme } = useAuth();

  const activeProfile = viewingAsEmployee || profile;

  // Format elapsed time HH:MM:SS
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const navItems: Array<{ id: EmployeeTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'leave', label: 'Time Off', icon: <Plane className="w-4 h-4" /> },
    { id: 'payroll', label: 'Salary & Payslips', icon: <Receipt className="w-4 h-4" /> },
    { id: 'profile', label: 'My Profile & Docs', icon: <User className="w-4 h-4" /> }
  ];

  return (
    <header className="border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 transition-colors">
      {/* Simulation Banner if Admin is Viewing As Employee */}
      {viewingAsEmployee && (
        <div className="bg-purple-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="bg-purple-800 text-purple-100 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Simulation Mode
            </span>
            <span>
              Viewing self-service portal as <strong>{viewingAsEmployee.full_name}</strong> ({viewingAsEmployee.department})
            </span>
          </div>
          <button
            onClick={() => setViewAsEmployee(null)}
            className="flex items-center gap-1 bg-purple-700 hover:bg-purple-800 text-white px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Console</span>
          </button>
        </div>
      )}

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Employee Identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="w-9 h-9 object-contain shrink-0" />
            <span className="font-display font-semibold text-lg text-slate-900 dark:text-white tracking-tight hidden sm:inline">
              Dayflow
            </span>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* User Badge */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold uppercase">
              {activeProfile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block leading-tight">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {activeProfile?.full_name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {activeProfile?.job_title} • {activeProfile?.employee_id}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Fast Punch Card */}
        <div className="flex items-center gap-3">
          {/* Punch Card Widget */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
            {isCheckedIn ? (
              <>
                <div className="flex items-center gap-1.5 px-2 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{timeString}</span>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={onCheckOut}
                  isLoading={checkInLoading}
                  className="text-xs py-1 px-2.5 h-7"
                >
                  Punch Out
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="success"
                onClick={onCheckIn}
                isLoading={checkInLoading}
                className="text-xs py-1 px-3 h-7"
                leftIcon={<Clock className="w-3.5 h-3.5" />}
              >
                Check In
              </Button>
            )}
          </div>

          <NotificationBell />

          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <Button
            size="sm"
            variant="ghost"
            onClick={signOut}
            className="text-xs gap-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-slate-100 dark:border-slate-800/80">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              currentTab === item.id
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
