import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import {
  CalendarCheck,
  Plane,
  Receipt,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '../../lib/utils.js';

interface EmployeeDashboardProps {
  onNavigateTab: (tab: 'attendance' | 'leave' | 'payroll' | 'profile') => void;
  isCheckedIn: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  checkInLoading: boolean;
  todayRecord: any;
  leaveBalances: any[];
  attendanceSummary: any;
  recentRequests: any[];
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onNavigateTab,
  isCheckedIn,
  onCheckIn,
  onCheckOut,
  checkInLoading,
  todayRecord,
  leaveBalances,
  attendanceSummary,
  recentRequests
}) => {
  const { profile, viewingAsEmployee } = useAuth();
  const currentProfile = viewingAsEmployee || profile;

  const paidBalance = leaveBalances.find((b) => b.leave_type === 'paid')?.remaining_days ?? 14;
  const sickBalance = leaveBalances.find((b) => b.leave_type === 'sick')?.remaining_days ?? 8;

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const upcomingHolidays = [
    { name: 'Labor Day', date: 'Sep 07, 2026', type: 'Public Holiday' },
    { name: 'Indigenous Peoples Day', date: 'Oct 12, 2026', type: 'Company Observance' },
    { name: 'Veterans Day', date: 'Nov 11, 2026', type: 'Public Holiday' }
  ];

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              {todayDateFormatted}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="text-slate-300 text-xs">{currentProfile?.department}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Hi, {currentProfile?.full_name?.split(' ')[0]}
            <span className="hand-note text-2xl text-emerald-300 ml-2 align-middle">— welcome back</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Punch in, check your leave balance, or grab last month's payslip — everything you need is one tab away.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="success"
            size="md"
            onClick={() => onNavigateTab('leave')}
            leftIcon={<Plane className="w-4 h-4" />}
            className="shadow-md"
          >
            Apply for Time Off
          </Button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Leave Balance */}
        <Card className="p-5 flex flex-col justify-between border-t-emerald-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Plane className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              Annual Cycle
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              {paidBalance} <span className="text-xs font-normal text-slate-500">Days</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Paid leave balance remaining (+{sickBalance} sick days)
            </div>
          </div>
        </Card>

        {/* Metric 2: Today's Status */}
        <Card className="p-5 flex flex-col justify-between border-t-blue-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <Badge variant={isCheckedIn ? 'present' : 'pending'}>
              {isCheckedIn ? 'Punched In' : 'Not Punched'}
            </Badge>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              {isCheckedIn ? 'Active Workday' : 'Pending Check-In'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {todayRecord?.check_in
                ? `Check-in recorded at ${new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Tap check-in to begin your daily shift'}
            </div>
          </div>
        </Card>

        {/* Metric 3: Attendance Efficiency */}
        <Card className="p-5 flex flex-col justify-between border-t-purple-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
              This Month
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              {attendanceSummary?.present || 18} <span className="text-xs font-normal text-slate-500">Days Present</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              98.2% on-time record across the past 30 days
            </div>
          </div>
        </Card>

        {/* Metric 4: Next Payday */}
        <Card className="p-5 flex flex-col justify-between border-t-amber-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              Auto Direct Deposit
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              Aug 31, 2026
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monthly payroll slip available for direct download
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Live Punch & Recent Activity + Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Actions & Punch Console (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Shift Console */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Daily Shift Punch
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Timestamps are cryptographically recorded in UTC and localized to your device timezone.
                </p>
              </div>
              <Badge variant={isCheckedIn ? 'present' : 'inactive'}>
                {isCheckedIn ? 'In Progress' : 'Off Duty'}
              </Badge>
            </div>

            <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Today's Timestamp Log
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Check-in:{' '}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {todayRecord?.check_in
                      ? new Date(todayRecord.check_in).toLocaleTimeString()
                      : '—'}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Check-out:{' '}
                  <span className="font-mono text-amber-600 dark:text-amber-400">
                    {todayRecord?.check_out
                      ? new Date(todayRecord.check_out).toLocaleTimeString()
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isCheckedIn ? (
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={onCheckOut}
                    isLoading={checkInLoading}
                    className="w-44"
                  >
                    Punch Out
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    size="lg"
                    onClick={onCheckIn}
                    isLoading={checkInLoading}
                    className="w-44"
                    leftIcon={<Clock className="w-5 h-5" />}
                  >
                    Punch In Now
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Need to report a missed punch?</span>
              <button
                onClick={() => onNavigateTab('attendance')}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Monthly Log</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>

          {/* Recent Leave Requests Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Time Off Applications
              </h3>
              <button
                onClick={() => onNavigateTab('leave')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {recentRequests.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No leave requests filed yet this quarter.
                </div>
              ) : (
                recentRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 capitalize">
                          {req.leave_type} Leave ({req.days_count} {req.days_count === 1 ? 'day' : 'days'})
                        </span>
                        <Badge variant={req.status}>{req.status}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {req.start_date} to {req.end_date} • "{req.remarks}"
                      </p>
                      {req.review_comment && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 italic">
                          HR Note: {req.review_comment}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDate(req.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right: Upcoming Holidays & Fast Links (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Holidays Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Upcoming Holidays
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">2026 Calendar</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {upcomingHolidays.map((holiday, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {holiday.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {holiday.type}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {holiday.date}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Portal Shortcuts */}
          <Card className="p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Self-Service Shortcuts
            </h3>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onNavigateTab('payroll')}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Download Latest Payslip (PDF)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      August 2026 Statement
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigateTab('profile')}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Document & Profile Vault
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tax forms, ID proofs, contracts
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
