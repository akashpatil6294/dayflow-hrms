import React from 'react';
import { Card } from '../ui/Card.js';
import { Badge } from '../ui/Badge.js';
import { formatCurrency } from '../../lib/utils.js';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Receipt,
  Download,
  Building2,
  CheckCircle2
} from 'lucide-react';

interface AdminAnalyticsProps {
  summary: any;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ summary }) => {
  const attendanceTrends = summary?.attendanceTrends || [
    { date: '08-10', present: 14, absent: 1, leave: 0 },
    { date: '08-11', present: 13, absent: 1, leave: 1 },
    { date: '08-12', present: 15, absent: 0, leave: 0 },
    { date: '08-13', present: 14, absent: 0, leave: 1 },
    { date: '08-14', present: 12, absent: 1, leave: 2 },
    { date: '08-17', present: 15, absent: 0, leave: 0 },
    { date: '08-18', present: 14, absent: 1, leave: 0 },
    { date: '08-19', present: 13, absent: 1, leave: 1 },
    { date: '08-20', present: 14, absent: 0, leave: 1 },
    { date: '08-21', present: 13, absent: 1, leave: 1 },
    { date: '08-22', present: 12, absent: 1, leave: 2 }
  ];

  const departmentHeadcount = summary?.headcount?.byDepartment || [
    { department: 'Engineering', count: 6 },
    { department: 'Product', count: 3 },
    { department: 'Design', count: 2 },
    { department: 'Human Resources', count: 2 },
    { department: 'Marketing', count: 2 }
  ];

  const leaveUtilization = summary?.leaveBreakdown?.byType || [
    { type: 'paid', count: 18 },
    { type: 'sick', count: 7 },
    { type: 'unpaid', count: 3 }
  ];

  const departmentPayroll = [
    { department: 'Engineering', total: 64500, avg: 10750 },
    { department: 'Product', total: 32000, avg: 10666 },
    { department: 'Design', total: 18500, avg: 9250 },
    { department: 'Human Resources', total: 14850, avg: 7425 },
    { department: 'Marketing', total: 12500, avg: 6250 }
  ];

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Workforce Intelligence & Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Realtime data visualization of attendance trends, leave utilization, and departmental payroll commitments.
          </p>
        </div>
      </div>

      {/* Primary Chart: 14-Day Attendance Area Trend */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              14-Day Attendance & Shift Flow
            </h3>
            <p className="text-xs text-slate-500">
              Daily counts of present workforce vs leave and absences.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            96.4% Efficiency
          </span>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="leaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="present"
                name="Present Staff"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#presentGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="leave"
                name="Approved Leave"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#leaveGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Secondary Row: 2 Split Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Payroll Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Department Payroll Volume ($)
            </h3>
            <span className="text-xs text-slate-500">Monthly Gross</span>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentPayroll} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="total" name="Total Payroll" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Leave Category Utilization */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Leave Days Consumed by Category
            </h3>
            <span className="text-xs text-slate-500">2026 Cycle</span>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveUtilization} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" name="Days Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
