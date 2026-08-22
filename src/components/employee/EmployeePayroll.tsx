import React, { useState } from 'react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { showToast } from '../ui/Toast.js';
import { formatCurrency } from '../../lib/utils.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Receipt,
  Download,
  Building2,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Calendar
} from 'lucide-react';

interface EmployeePayrollProps {
  payrollData: any;
}

export const EmployeePayroll: React.FC<EmployeePayrollProps> = ({ payrollData }) => {
  const { user, profile, viewingAsEmployee } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const activeProfile = viewingAsEmployee || profile;

  const structure = payrollData?.structure || {
    base_salary: 8500,
    hra: 2500,
    transport_allowance: 400,
    medical_allowance: 300,
    special_allowance: 800,
    provident_fund: 680,
    tax_deduction: 1200,
    insurance_deduction: 250
  };

  const totalEarnings =
    (structure.base_salary || 0) +
    (structure.hra || 0) +
    (structure.transport_allowance || 0) +
    (structure.medical_allowance || 0) +
    (structure.special_allowance || 0);

  const totalDeductions =
    (structure.provident_fund || 0) +
    (structure.tax_deduction || 0) +
    (structure.insurance_deduction || 0);

  const netSalary = totalEarnings - totalDeductions;
  const annualCtc = totalEarnings * 12;

  const handleDownloadSlip = async (monthName: string = 'August 2026') => {
    setDownloading(true);
    try {
      const targetUserId = activeProfile?.user_id || user?.id;
      const downloadUrl = `/api/payroll/salary-slip/${targetUserId}?month=${encodeURIComponent(monthName)}`;

      // Fetch with auth credentials
      const token = localStorage.getItem('dayflow_jwt');
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error('Failed to generate PDF salary slip');

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Dayflow_Payslip_${activeProfile?.employee_id || 'EMP'}_${monthName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      showToast('Payslip Downloaded', 'success', `PDF generated for ${monthName}`);
    } catch (err: any) {
      showToast('Download Failed', 'error', err.message);
    } finally {
      setDownloading(false);
    }
  };

  const pastSlips = [
    { month: 'August 2026', gross: totalEarnings, net: netSalary, status: 'Paid', date: 'Aug 31, 2026' },
    { month: 'July 2026', gross: totalEarnings, net: netSalary, status: 'Paid', date: 'Jul 31, 2026' },
    { month: 'June 2026', gross: totalEarnings, net: netSalary, status: 'Paid', date: 'Jun 30, 2026' },
    { month: 'May 2026', gross: totalEarnings, net: netSalary, status: 'Paid', date: 'May 31, 2026' }
  ];

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* Header & Quick Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Salary & Compensation</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review your compensation breakdown, statutory tax deductions, and download signed salary slips.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => handleDownloadSlip('August 2026')}
          isLoading={downloading}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Download August 2026 Payslip
        </Button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Net Monthly Take-Home
          </span>
          <div className="text-3xl font-mono font-semibold tabular text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(netSalary)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Direct deposit credited to account on last business day
          </span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monthly Gross Earnings
          </span>
          <div className="text-3xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(totalEarnings)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Includes base wage, allowances & incentives
          </span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Annual CTC Package
          </span>
          <div className="text-3xl font-mono font-semibold tabular text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(annualCtc)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Total Cost to Company (excluding discretionary bonus)
          </span>
        </Card>
      </div>

      {/* Salary Structure Breakdown Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Earnings Column */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Monthly Earnings
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalEarnings)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-2">
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Base Salary</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(structure.base_salary)}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">House Rent Allowance (HRA)</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(structure.hra)}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Transport Allowance</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(structure.transport_allowance)}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Medical Allowance</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(structure.medical_allowance)}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Special Allowance</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(structure.special_allowance)}
              </span>
            </div>
          </div>
        </Card>

        {/* Deductions Column */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Statutory & Tax Deductions
            </h3>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              -{formatCurrency(totalDeductions)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-2">
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Provident Fund (Employee PF 12%)</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                -{formatCurrency(structure.provident_fund)}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Income Tax (TDS Estimate)</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                -{formatCurrency(structure.tax_deduction)}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Health Insurance Premium</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                -{formatCurrency(structure.insurance_deduction)}
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Direct Deposit Bank Account</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              {(activeProfile?.bank_account_no || activeProfile?.bank_account_number)
                ? `•••• •••• •••• ${(activeProfile.bank_account_no || activeProfile.bank_account_number).slice(-4)}`
                : '•••• •••• •••• 9842'}
            </div>
            <div className="text-[11px] text-slate-500">
              IFSC / Routing: {activeProfile?.ifsc_or_routing || activeProfile?.bank_ifsc || 'DFLW0004921'}
            </div>
          </div>
        </Card>
      </div>

      {/* Salary Slips Archive */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Historical Payslips Archive
            </h3>
            <p className="text-xs text-slate-500">
              Download digitally generated PDF salary statements for your tax declarations.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Pay Period</th>
                <th className="py-3 px-3">Gross Earnings</th>
                <th className="py-3 px-3">Net Disbursed</th>
                <th className="py-3 px-3">Disbursement Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">PDF Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pastSlips.map((slip, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {slip.month}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                    {formatCurrency(slip.gross)}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(slip.net)}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">
                    {slip.date}
                  </td>
                  <td className="py-3.5 px-3">
                    <Badge variant="approved">{slip.status}</Badge>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadSlip(slip.month)}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Download PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
