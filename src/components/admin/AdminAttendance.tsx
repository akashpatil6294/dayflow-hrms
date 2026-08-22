import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Input } from '../ui/Input.js';
import { Modal } from '../ui/Modal.js';
import { showToast } from '../ui/Toast.js';
import { api } from '../../lib/api.js';
import { formatTime, formatDate } from '../../lib/utils.js';
import {
  CalendarCheck,
  Search,
  Filter,
  Clock,
  Edit2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus
} from 'lucide-react';

interface AdminAttendanceProps {
  onRefresh: () => void;
}

export const AdminAttendance: React.FC<AdminAttendanceProps> = ({ onRefresh }) => {
  const [date, setDate] = useState('2026-08-22');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [adjustDate, setAdjustDate] = useState('2026-08-22');
  const [adjustStatus, setAdjustStatus] = useState<'present' | 'absent' | 'half_day' | 'leave'>('present');
  const [adjustCheckIn, setAdjustCheckIn] = useState('09:00');
  const [adjustCheckOut, setAdjustCheckOut] = useState('17:30');
  const [adjustNotes, setAdjustNotes] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await api.attendance.all({
        date: date || undefined,
        department: department !== 'all' ? department : undefined,
        status: status !== 'all' ? status : undefined,
        search: search.trim() || undefined
      });
      setRecords(data.records);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [date, department, status, search]);

  const summary = {
    present: records.filter((r) => r.status === 'present').length,
    half_day: records.filter((r) => r.status === 'half_day').length,
    leave: records.filter((r) => r.status === 'leave').length,
    absent: records.filter((r) => r.status === 'absent').length
  };

  const handleOpenAdjust = (rec?: any) => {
    if (rec) {
      setSelectedProfileId(rec.profile_id);
      setAdjustDate(rec.date);
      setAdjustStatus(rec.status);
      setAdjustCheckIn(rec.check_in ? new Date(rec.check_in).toTimeString().slice(0, 5) : '09:00');
      setAdjustCheckOut(rec.check_out ? new Date(rec.check_out).toTimeString().slice(0, 5) : '17:30');
      setAdjustNotes(rec.notes || 'Admin manual override');
    } else {
      setSelectedProfileId('');
      setAdjustDate(date);
      setAdjustStatus('present');
      setAdjustCheckIn('09:00');
      setAdjustCheckOut('17:30');
      setAdjustNotes('Admin recorded attendance adjustment');
    }
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) {
      showToast('Select Employee', 'warning', 'Please specify an employee profile.');
      return;
    }

    setAdjustLoading(true);
    try {
      const checkInIso = `${adjustDate}T${adjustCheckIn}:00Z`;
      const checkOutIso = adjustCheckOut ? `${adjustDate}T${adjustCheckOut}:00Z` : undefined;

      await api.attendance.record({
        profile_id: selectedProfileId,
        date: adjustDate,
        status: adjustStatus,
        check_in: adjustStatus !== 'absent' && adjustStatus !== 'leave' ? checkInIso : undefined,
        check_out: adjustStatus !== 'absent' && adjustStatus !== 'leave' ? checkOutIso : undefined,
        notes: adjustNotes.trim()
      });

      showToast('Attendance Adjusted', 'success', 'Shift log successfully updated in database.');
      setIsAdjustModalOpen(false);
      fetchRecords();
      onRefresh();
    } catch (err: any) {
      showToast('Adjustment Failed', 'error', err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header & New Entry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Attendance Central</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Realtime daily attendance tracking, shift anomalies, and HR manual overrides.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => handleOpenAdjust()}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-purple-600 hover:bg-purple-500"
        >
          Manual Shift Override
        </Button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Present</span>
          <span className="text-xl font-mono font-semibold tabular text-emerald-700 dark:text-emerald-400">{summary.present}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Half Day</span>
          <span className="text-xl font-mono font-semibold tabular text-amber-700 dark:text-amber-400">{summary.half_day}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">On Leave</span>
          <span className="text-xl font-mono font-semibold tabular text-indigo-700 dark:text-indigo-400">{summary.leave}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Absent</span>
          <span className="text-xl font-mono font-semibold tabular text-rose-700 dark:text-rose-400">{summary.absent}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />

          <Input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Design">Design</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Marketing">Marketing</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="half_day">Half Day</option>
            <option value="leave">Leave</option>
            <option value="absent">Absent</option>
          </select>
        </div>
      </Card>

      {/* Attendance Master Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Check In</th>
                <th className="py-3 px-3">Check Out</th>
                <th className="py-3 px-3">Total Worked</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Adjustment Notes</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No attendance records logged for {date}.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div>{r.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.employee_id}</div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                      {r.department}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {formatTime(r.check_in)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {formatTime(r.check_out)}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {r.hours_worked ? `${r.hours_worked} hrs` : '—'}
                    </td>

                    <td className="py-3.5 px-3">
                      <Badge variant={r.status}>{r.status}</Badge>
                    </td>

                    <td className="py-3.5 px-3 text-slate-500 italic max-w-xs truncate">
                      {r.notes || '—'}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAdjust(r)}
                        leftIcon={<Edit2 className="w-3 h-3" />}
                        className="text-xs py-1 px-2.5 h-7"
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MANUAL ADJUSTMENT MODAL */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => !adjustLoading && setIsAdjustModalOpen(false)}
        title="Manual Shift Adjustment"
        description="Override check-in timestamps or change attendance classification."
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Employee User ID / Target"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              placeholder="e.g. emp_alex"
              required
            />
            <Input
              label="Shift Date"
              type="date"
              value={adjustDate}
              onChange={(e) => setAdjustDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Attendance Status Classification
            </label>
            <select
              value={adjustStatus}
              onChange={(e) => setAdjustStatus(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="present">Present (Standard Day)</option>
              <option value="half_day">Half Day (&lt;4 Working Hours)</option>
              <option value="leave">Approved Leave</option>
              <option value="absent">Unexcused Absence</option>
            </select>
          </div>

          {adjustStatus !== 'absent' && adjustStatus !== 'leave' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Check In Time"
                type="time"
                value={adjustCheckIn}
                onChange={(e) => setAdjustCheckIn(e.target.value)}
                required
              />
              <Input
                label="Check Out Time"
                type="time"
                value={adjustCheckOut}
                onChange={(e) => setAdjustCheckOut(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Audit Note / Reason
            </label>
            <textarea
              rows={2}
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="Reason for HR manual adjustment..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustModalOpen(false)}
              disabled={adjustLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={adjustLoading}>
              Save Shift Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
