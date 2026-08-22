import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { Input } from '../ui/Input.js';
import { showToast } from '../ui/Toast.js';
import { api } from '../../lib/api.js';
import { LeaveBalance, LeaveRequest } from '../../types/index.js';
import { formatDate } from '../../lib/utils.js';
import {
  Plane,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface EmployeeLeaveProps {
  balances: LeaveBalance[];
  requests: LeaveRequest[];
  onRefresh: () => void;
}

export const EmployeeLeave: React.FC<EmployeeLeaveProps> = ({
  balances,
  requests,
  onRefresh
}) => {
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState<'paid' | 'sick' | 'unpaid'>('paid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Calculate days between
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    let count = 0;
    let cur = new Date(start);
    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const calculatedDays = calculateDays();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !remarks.trim()) {
      showToast('Incomplete Application', 'warning', 'Please provide start date, end date, and reason.');
      return;
    }

    if (calculatedDays <= 0) {
      showToast('Invalid Dates', 'error', 'End date must be on or after start date.');
      return;
    }

    // Check balance
    const currentBalance = balances.find((b) => b.leave_type === leaveType);
    if (leaveType !== 'unpaid' && currentBalance && calculatedDays > currentBalance.remaining_days) {
      showToast('Insufficient Balance', 'error', `You only have ${currentBalance.remaining_days} remaining ${leaveType} leave days.`);
      return;
    }

    setLoading(true);
    try {
      await api.leave.apply({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        remarks: remarks.trim()
      });

      showToast('Leave Request Submitted', 'success', 'Your application is in the HR approval queue.');
      setIsApplyModalOpen(false);
      setStartDate('');
      setEndDate('');
      setRemarks('');
      onRefresh();
    } catch (err: any) {
      showToast('Application Failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header & Apply Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plane className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Time Off & Leave Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track your leave allocations, submit time-off requests, and monitor manager approvals in real time.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsApplyModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Apply for Leave
        </Button>
      </div>

      {/* Leave Balance Cards (3 types) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {balances.map((b) => {
          const isSick = b.leave_type === 'sick';
          const isPaid = b.leave_type === 'paid';
          const total = b.total_days;
          const used = b.used_days;
          const remaining = b.remaining_days;
          const pct = total > 0 ? Math.round((used / total) * 100) : 0;

          return (
            <Card key={b.leave_type} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {b.leave_type} Leave
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isPaid
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : isSick
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    Annual Pool
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100">
                    {remaining}
                  </span>
                  <span className="text-xs text-slate-500">
                    days left of {total} total
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Used: {used} days</span>
                  <span>{pct}% consumed</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isPaid ? 'bg-emerald-500' : isSick ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Leave Application History Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Leave Request History
            </h3>
            <p className="text-xs text-slate-500">
              All applications submitted during the 2026 fiscal cycle.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {requests.length} {requests.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Applied On</th>
                <th className="py-3 px-3">Leave Type</th>
                <th className="py-3 px-3">Dates</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Review Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leave requests found. Click "Apply for Leave" above to submit one.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3 text-slate-500">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {r.leave_type}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {r.start_date} → {r.end_date}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {r.days_count} {r.days_count === 1 ? 'day' : 'days'}
                    </td>
                    <td className="py-3.5 px-3 max-w-xs text-slate-600 dark:text-slate-400 truncate" title={r.remarks}>
                      {r.remarks}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={r.status}>{r.status}</Badge>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 italic max-w-xs truncate" title={r.review_comment || ''}>
                      {r.review_comment || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Apply For Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => !loading && setIsApplyModalOpen(false)}
        title="Apply for Time Off"
        description="Submit a leave request for HR review. Business days exclude weekends."
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Leave Category
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="paid">Paid Annual Leave</option>
              <option value="sick">Sick / Medical Leave</option>
              <option value="unpaid">Unpaid Personal Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          {startDate && endDate && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span>Requested Business Days:</span>
              <strong className="font-mono text-sm">{calculatedDays} {calculatedDays === 1 ? 'Day' : 'Days'}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Reason / Remarks
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Please describe reason for leave and handoff coverage..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApplyModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
