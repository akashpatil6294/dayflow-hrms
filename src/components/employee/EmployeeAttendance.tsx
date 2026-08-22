import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import {
  CalendarCheck,
  Clock,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatTime, formatDate } from '../../lib/utils.js';

interface EmployeeAttendanceProps {
  records: any[];
  todayRecord: any;
  summary: any;
  isCheckedIn: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  checkInLoading: boolean;
  elapsedSeconds: number;
}

export const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({
  records,
  todayRecord,
  summary,
  isCheckedIn,
  onCheckIn,
  onCheckOut,
  checkInLoading,
  elapsedSeconds
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRecords = records.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const timerStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Helper to build simple calendar days for current month
  const renderCalendar = () => {
    const daysInMonth = 31; // August
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
      const rec = records.find((r) => r.date === dateStr);
      const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

      days.push(
        <div
          key={day}
          className={`min-h-[72px] p-2 rounded-lg border text-left transition-colors flex flex-col justify-between ${
            isWeekend
              ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/40 opacity-60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {day}
            </span>
            {isWeekend && <span className="text-[10px] text-slate-400">Weekend</span>}
          </div>

          {rec && (
            <div className="mt-1">
              <Badge variant={rec.status} className="text-[10px] py-0 px-1.5">
                {rec.status}
              </Badge>
              {rec.check_in && (
                <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                  {new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Top Banner: Shift Punch Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <Card className="lg:col-span-8 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Attendance Center
                </h2>
              </div>
              <Badge variant={isCheckedIn ? 'present' : 'inactive'}>
                {isCheckedIn ? 'Shift In Progress' : 'Not Punched In'}
              </Badge>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Check in daily to record shift hours. Status automatically transitions to Half-day if checkout occurs before 4 cumulative working hours.
            </p>
          </div>

          <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Check In Time
              </span>
              <div className="text-base font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                {todayRecord?.check_in ? formatTime(todayRecord.check_in) : '—'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Elapsed Active Time
              </span>
              <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {isCheckedIn ? timerStr : '00:00:00'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Check Out Time
              </span>
              <div className="text-base font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                {todayRecord?.check_out ? formatTime(todayRecord.check_out) : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {isCheckedIn ? (
              <Button
                variant="danger"
                size="lg"
                onClick={onCheckOut}
                isLoading={checkInLoading}
                className="w-full sm:w-auto px-8"
              >
                Punch Out
              </Button>
            ) : (
              <Button
                variant="success"
                size="lg"
                onClick={onCheckIn}
                isLoading={checkInLoading}
                className="w-full sm:w-auto px-8"
                leftIcon={<Clock className="w-5 h-5" />}
              >
                Punch In Now
              </Button>
            )}
          </div>
        </Card>

        {/* Attendance KPI Summary */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monthly Performance (August 2026)
          </h3>

          <div className="space-y-3 my-4">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Full Days Present
                </span>
              </div>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {summary?.present || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Half Days
                </span>
              </div>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {summary?.half_day || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Approved Leaves
                </span>
              </div>
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                {summary?.leave || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Unexcused Absences
                </span>
              </div>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                {summary?.absent || 0}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Attendance rate: <strong>96.8%</strong> this quarter.
          </div>
        </Card>
      </div>

      {/* History Log Controls */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Attendance Records Log
            </h3>
            <p className="text-xs text-slate-500">
              Review your full attendance activity by month.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="half_day">Half Day</option>
              <option value="leave">Leave</option>
              <option value="absent">Absent</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Content Display */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Check In</th>
                  <th className="py-3 px-3">Check Out</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No attendance records found for selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100 font-mono">
                        {r.date}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {formatTime(r.check_in)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {formatTime(r.check_out)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={r.status}>{r.status}</Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-500 italic">
                        {r.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 mt-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-400 py-1">
                {d}
              </div>
            ))}
            {renderCalendar()}
          </div>
        )}
      </Card>
    </div>
  );
};
