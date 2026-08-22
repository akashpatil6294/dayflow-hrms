import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastContainer, showToast } from './components/ui/Toast.js';
import { AuthPage } from './components/auth/AuthPage.js';
import { api } from './lib/api.js';
import { realtime } from './lib/websocket.js';
import { Logo } from './components/shared/Logo.js';

// Employee Portal Components
import { EmployeeHeader, EmployeeTab } from './components/employee/EmployeeHeader.js';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard.js';
import { EmployeeAttendance } from './components/employee/EmployeeAttendance.js';
import { EmployeeLeave } from './components/employee/EmployeeLeave.js';
import { EmployeePayroll } from './components/employee/EmployeePayroll.js';
import { EmployeeProfile } from './components/employee/EmployeeProfile.js';

// Admin Portal Components
import { AdminHeader, AdminTab } from './components/admin/AdminHeader.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { AdminEmployees } from './components/admin/AdminEmployees.js';
import { AdminLeaveApprovals } from './components/admin/AdminLeaveApprovals.js';
import { AdminAttendance } from './components/admin/AdminAttendance.js';
import { AdminPayroll } from './components/admin/AdminPayroll.js';
import { AdminAnalytics } from './components/admin/AdminAnalytics.js';

import {
  Profile,
  AttendanceRecord,
  LeaveBalance,
  LeaveRequest,
  AnalyticsSummary
} from './types/index.js';

const MainLayout: React.FC = () => {
  const { user, profile, activeViewRole, viewingAsEmployee, isLoading, refreshProfile } = useAuth();

  // Navigation State
  const [employeeTab, setEmployeeTab] = useState<EmployeeTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Shared Data States
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);

  // Employee Specific Data States
  const [myAttendanceRecords, setMyAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequest[]>([]);
  const [myPayroll, setMyPayroll] = useState<any>(null);

  // Admin Specific Data States
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);

  // Shift Punch / Timer State
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);

  const activeUserId = viewingAsEmployee?.user_id || user?.id;

  // Fetch Employee Data
  const loadEmployeeData = async () => {
    if (!activeUserId) return;
    try {
      const [attData, leaveBalData, leaveReqData, payrollData] = await Promise.all([
        api.attendance.my(undefined, activeUserId),
        api.leave.balances(activeUserId),
        api.leave.my(),
        api.payroll.my(activeUserId)
      ]);

      setMyAttendanceRecords(attData.records);
      setTodayRecord(attData.todayRecord);
      setAttendanceSummary(attData.summary);
      setLeaveBalances(leaveBalData.balances);
      setMyLeaveRequests(leaveReqData.requests);
      setMyPayroll(payrollData.payroll);

      if (attData.todayRecord && attData.todayRecord.check_in && !attData.todayRecord.check_out) {
        setIsCheckedIn(true);
        const checkInTime = new Date(attData.todayRecord.check_in).getTime();
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((now - checkInTime) / 1000));
        setElapsedSeconds(diffSeconds);
      } else {
        setIsCheckedIn(false);
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('Failed to load employee data:', err);
    }
  };

  // Fetch Admin Data
  const loadAdminData = async () => {
    try {
      const [empData, summaryData, leaveData] = await Promise.all([
        api.employees.list(),
        api.analytics.summary(),
        api.leave.all()
      ]);

      setEmployees(empData.employees);
      setAnalyticsSummary(summaryData);
      setAllLeaveRequests(leaveData.requests);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  // Initial and reactive data load
  useEffect(() => {
    if (!user) return;

    if (activeViewRole === 'admin') {
      loadAdminData();
    } else {
      loadEmployeeData();
    }
  }, [user, activeViewRole, activeUserId]);

  // Live Timer Interval when checked in
  useEffect(() => {
    let interval: any = null;
    if (isCheckedIn) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCheckedIn]);

  // Realtime WebSocket Listener for instant UI sync
  useEffect(() => {
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type === 'leave_status_updated') {
        showToast(
          'Leave Status Updated',
          event.status === 'approved' ? 'success' : 'warning',
          `Your leave request was ${event.status}.`
        );
        loadEmployeeData();
      } else if (event.type === 'new_leave_request') {
        showToast('New Leave Request', 'info', `${event.employee_name} submitted a leave request.`);
        if (activeViewRole === 'admin') {
          loadAdminData();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeViewRole]);

  // Attendance Actions
  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const res = await api.attendance.checkIn();
      showToast('Shift Started', 'success', `Check-in recorded at ${new Date(res.check_in).toLocaleTimeString()}`);
      setIsCheckedIn(true);
      setElapsedSeconds(0);
      loadEmployeeData();
    } catch (err: any) {
      showToast('Check-in Failed', 'error', err.message);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      const res = await api.attendance.checkOut();
      showToast('Shift Concluded', 'info', `Logged ${res.hours_worked} hours today.`);
      setIsCheckedIn(false);
      loadEmployeeData();
    } catch (err: any) {
      showToast('Check-out Failed', 'error', err.message);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleReviewLeave = async (requestId: string, status: 'approved' | 'rejected') => {
    setReviewLoading(true);
    try {
      await api.leave.review({
        request_id: requestId,
        status,
        comment: status === 'approved' ? 'Approved by HR Operations.' : 'Rejected per policy guidelines.'
      });

      showToast(
        status === 'approved' ? 'Request Approved' : 'Request Rejected',
        status === 'approved' ? 'success' : 'warning',
        `Leave decision recorded.`
      );
      loadAdminData();
    } catch (err: any) {
      showToast('Review Failed', 'error', err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Logo className="w-14 h-14 object-contain animate-pulse" />
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase font-mono">
            opening the ledger…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {activeViewRole === 'admin' ? (
        /* ADMIN PORTAL */
        <>
          <AdminHeader
            currentTab={adminTab}
            onTabChange={setAdminTab}
            employees={employees}
            onResetComplete={() => {
              loadAdminData();
              loadEmployeeData();
            }}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {adminTab === 'dashboard' && (
              <AdminDashboard
                onNavigateTab={setAdminTab}
                summary={analyticsSummary}
                pendingRequests={allLeaveRequests.filter((r) => r.status === 'pending')}
                onReviewLeave={handleReviewLeave}
                reviewLoading={reviewLoading}
              />
            )}
            {adminTab === 'employees' && (
              <AdminEmployees employees={employees} onRefresh={loadAdminData} />
            )}
            {adminTab === 'approvals' && (
              <AdminLeaveApprovals requests={allLeaveRequests} onRefresh={loadAdminData} />
            )}
            {adminTab === 'attendance' && (
              <AdminAttendance onRefresh={loadAdminData} />
            )}
            {adminTab === 'payroll' && (
              <AdminPayroll onRefresh={loadAdminData} />
            )}
            {adminTab === 'analytics' && (
              <AdminAnalytics summary={analyticsSummary} />
            )}
          </main>

          <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-2">
            <p className="hand-note text-xl text-slate-400 dark:text-slate-600">
              kept by the Dayflow team, updated every shift
            </p>
          </footer>
        </>
      ) : (
        /* EMPLOYEE PORTAL */
        <>
          <EmployeeHeader
            currentTab={employeeTab}
            onTabChange={setEmployeeTab}
            isCheckedIn={isCheckedIn}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            checkInLoading={checkInLoading}
            elapsedSeconds={elapsedSeconds}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {employeeTab === 'dashboard' && (
              <EmployeeDashboard
                onNavigateTab={(tab) => setEmployeeTab(tab)}
                isCheckedIn={isCheckedIn}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                checkInLoading={checkInLoading}
                todayRecord={todayRecord}
                leaveBalances={leaveBalances}
                attendanceSummary={attendanceSummary}
                recentRequests={myLeaveRequests}
              />
            )}
            {employeeTab === 'attendance' && (
              <EmployeeAttendance
                records={myAttendanceRecords}
                todayRecord={todayRecord}
                summary={attendanceSummary}
                isCheckedIn={isCheckedIn}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                checkInLoading={checkInLoading}
                elapsedSeconds={elapsedSeconds}
              />
            )}
            {employeeTab === 'leave' && (
              <EmployeeLeave
                balances={leaveBalances}
                requests={myLeaveRequests}
                onRefresh={loadEmployeeData}
              />
            )}
            {employeeTab === 'payroll' && (
              <EmployeePayroll payrollData={myPayroll} />
            )}
            {employeeTab === 'profile' && (
              <EmployeeProfile
                profile={viewingAsEmployee || profile}
                onProfileUpdated={() => {
                  refreshProfile();
                  loadEmployeeData();
                }}
              />
            )}
          </main>

          <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-2">
            <p className="hand-note text-xl text-slate-400 dark:text-slate-600">
              punch in, and we'll handle the rest
            </p>
          </footer>
        </>
      )}

      {/* Global Toast Layer */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
