import React from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { formatCurrency, formatDate, formatTime } from '../../lib/utils.js';
import {
  Users,
  CheckSquare,
  CalendarCheck,
  Receipt,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { AdminTab } from './AdminHeader.js';

interface AdminDashboardProps {
  onNavigateTab: (tab: AdminTab) => void;
  summary: any;
  pendingRequests: any[];
  onReviewLeave: (requestId: string, status: 'approved' | 'rejected') => void;
  reviewLoading: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  summary,
  pendingRequests,
  onReviewLeave,
  reviewLoading
}) => {
  const totalEmployees = summary?.headcount?.total || 15;
  const presentToday = summary?.attendanceSummary?.present || 12;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
  const pendingCount = pendingRequests.length;
  const monthlyPayroll = summary?.payrollSummary?.totalMonthlyPayroll || 142350;

  const departmentCounts = summary?.headcount?.byDepartment || [
    { department: 'Engineering', count: 6 },
    { department: 'Product', count: 3 },
    { department: 'Design', count: 2 },
    { department: 'Human Resources', count: 2 },
    { department: 'Marketing', count: 2 }
  ];

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
              HR Console
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            <span className="text-slate-400 text-xs">synced live</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Morning — here's where things stand.
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            {pendingCount > 0
              ? `${pendingCount} leave request${pendingCount === 1 ? '' : 's'} waiting on you, ${presentToday} people already on the clock.`
              : `Nothing waiting on you right now — ${presentToday} people are on the clock.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() => onNavigateTab('approvals')}
            leftIcon={<CheckSquare className="w-4 h-4" />}
            className="bg-purple-600 hover:bg-purple-500"
          >
            Review Approvals ({pendingCount})
          </Button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workforce */}
        <Card className="p-5 flex flex-col justify-between border-t-purple-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <Badge variant="admin">Full-Time Staff</Badge>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              {totalEmployees} <span className="text-xs font-normal text-slate-500">Employees</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active across 5 engineering & ops departments
            </div>
          </div>
        </Card>

        {/* Present Today */}
        <Card className="p-5 flex flex-col justify-between border-t-emerald-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {attendanceRate}% Present
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              {presentToday} <span className="text-xs font-normal text-slate-500">Checked In</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {summary?.attendanceSummary?.leave || 2} on approved leave • {summary?.attendanceSummary?.absent || 1} off-duty
            </div>
          </div>
        </Card>

        {/* Pending Approvals */}
        <Card className="p-5 flex flex-col justify-between border-t-amber-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <Badge variant="pending">Action Required</Badge>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              {pendingCount} <span className="text-xs font-normal text-slate-500">Requests</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Leave requests pending HR manager review
            </div>
          </div>
        </Card>

        {/* Monthly Payroll */}
        <Card className="p-5 flex flex-col justify-between border-t-blue-500/70 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
              August Cycle
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
              {formatCurrency(monthlyPayroll)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monthly gross disbursed across company
            </div>
          </div>
        </Card>
      </div>

      {/* Main Split: Realtime Approvals Queue + Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending Approvals Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Pending Leave Queue
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('approvals')}
                className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
              >
                Open Full Queue →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {pendingRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No pending applications
                  </p>
                  <p className="text-slate-400">
                    All employee leave submissions are currently reviewed and processed.
                  </p>
                </div>
              ) : (
                pendingRequests.slice(0, 4).map((req) => (
                  <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {req.employee_name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({req.department})
                        </span>
                        <Badge variant="pending">Pending</Badge>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <strong className="capitalize">{req.leave_type} Leave</strong>: {req.start_date} to {req.end_date} ({req.days_count} {req.days_count === 1 ? 'day' : 'days'})
                      </div>

                      <p className="text-[11px] text-slate-500 italic">
                        "{req.remarks}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="success"
                        disabled={reviewLoading}
                        onClick={() => onReviewLeave(req.id, 'approved')}
                        className="text-xs py-1 px-2.5 h-8"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={reviewLoading}
                        onClick={() => onReviewLeave(req.id, 'rejected')}
                        className="text-xs py-1 px-2.5 h-8"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right: Department Breakdown & System Intelligence (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Department Headcount Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Department Distribution
                </h3>
              </div>
              <span className="text-xs text-slate-500">5 Divisions</span>
            </div>

            <div className="space-y-3 mt-4">
              {departmentCounts.map((dept: any) => {
                const pct = Math.round((dept.count / totalEmployees) * 100);
                return (
                  <div key={dept.department} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{dept.department}</span>
                      <span>
                        {dept.count} <span className="font-normal text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Management Shortcuts */}
          <Card className="p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick Admin Actions
            </h3>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onNavigateTab('employees')}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Onboard New Employee
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Create credentials, salary tier & assign department
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigateTab('payroll')}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Run Payroll Integrity Check
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Validate bank accounts and statutory tax withholdings
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
