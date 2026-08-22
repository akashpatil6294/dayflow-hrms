import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../ui/Button.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { NotificationBell } from '../shared/NotificationBell.js';
import { Logo } from '../shared/Logo.js';
import { showToast } from '../ui/Toast.js';
import { api } from '../../lib/api.js';
import { Profile } from '../../types/index.js';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CalendarCheck,
  Receipt,
  BarChart3,
  LogOut,
  RotateCcw,
  Eye,
  ShieldCheck
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'employees'
  | 'approvals'
  | 'attendance'
  | 'payroll'
  | 'analytics';

interface AdminHeaderProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  employees: Profile[];
  onResetComplete: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTab,
  onTabChange,
  employees,
  onResetComplete
}) => {
  const { profile, setViewAsEmployee, signOut, theme, toggleTheme } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [viewAsDropdown, setViewAsDropdown] = useState(false);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset database to default seed state with 15 employees, attendance history, and sample leave requests?')) {
      return;
    }
    setResetting(true);
    try {
      await api.demo.reset();
      showToast('Database Reset', 'success', 'Seeded with 15 employees and full activity history.');
      onResetComplete();
    } catch (err: any) {
      showToast('Reset Failed', 'error', err.message);
    } finally {
      setResetting(false);
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Console', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'employees', label: 'Workforce Directory', icon: <Users className="w-4 h-4" /> },
    { id: 'approvals', label: 'Leave Approvals', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance Central', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'payroll', label: 'Payroll & CTC', icon: <Receipt className="w-4 h-4" /> },
    { id: 'analytics', label: 'Intelligence & Reports', icon: <BarChart3 className="w-4 h-4" /> }
  ];

  return (
    <header className="border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 transition-colors">
      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Admin Identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="w-9 h-9 object-contain shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-lg text-slate-900 dark:text-white tracking-tight hidden sm:inline">
                Dayflow
              </span>
              <span className="stamp bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-700/60" style={{ ['--stamp-tilt' as any]: '-1.2deg' }}>
                Admin
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Fast Simulation Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* "View As Employee" Quick Selector */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewAsDropdown(!viewAsDropdown)}
              leftIcon={<Eye className="w-3.5 h-3.5 text-purple-600" />}
              className="text-xs hidden md:inline-flex"
            >
              Simulate View As...
            </Button>

            {viewAsDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                  Select Employee Portal
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {employees.map((emp) => (
                    <button
                      key={emp.user_id}
                      onClick={() => {
                        setViewAsEmployee(emp);
                        setViewAsDropdown(false);
                        showToast('Simulating Portal', 'info', `Switched to ${emp.full_name}'s view`);
                      }}
                      className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {emp.full_name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {emp.department} • {emp.job_title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetDemo}
            isLoading={resetting}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs text-slate-500 hover:text-purple-600"
            title="Reset to 15 demo employees and records"
          >
            <span className="hidden lg:inline">Reset Demo</span>
          </Button>

          <NotificationBell />

          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <Button
            size="sm"
            variant="ghost"
            onClick={signOut}
            className="text-xs gap-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Admin Navigation Sub-bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-slate-100 dark:border-slate-800/80">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              currentTab === item.id
                ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-400'
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
