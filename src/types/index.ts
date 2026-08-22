export type UserRole = 'admin' | 'employee';

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';

export type LeaveType = 'paid' | 'sick' | 'unpaid';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  is_email_verified: boolean;
  created_at: string;
}

export interface Profile {
  user_id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  full_name: string;
  department: string;
  job_title: string;
  phone: string;
  address: string;
  date_of_birth?: string;
  gender?: string;
  profile_picture_file_id: string | null;
  profile_picture_url?: string | null;
  date_joined?: string;
  date_of_joining?: string;
  status: 'active' | 'inactive';
  bank_account_no?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  ifsc_or_routing?: string;
  pan_number?: string;
}

export interface SalaryStructure {
  profile_id: string;
  base_salary: number;
  allowances: {
    hra: number;
    transport: number;
    medical: number;
    special: number;
  };
  deductions: {
    provident_fund: number;
    tax: number;
    insurance: number;
  };
  net_salary?: number;
  effective_from: string;
}

export interface AttendanceRecord {
  id: string;
  profile_id: string;
  employee_name?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  check_in: string | null; // ISO timestamp
  check_out: string | null; // ISO timestamp
  status: AttendanceStatus;
  notes: string | null;
}

export interface LeaveRequest {
  id: string;
  profile_id: string;
  employee_name?: string;
  employee_id?: string;
  department?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  remarks: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewer_name?: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  profile_id: string;
  leave_type: LeaveType;
  total_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
}

export interface DocumentItem {
  id: string;
  profile_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_at: string;
  uploaded_by: string;
  uploader_name?: string;
}

export interface NotificationItem {
  id: string;
  profile_id: string;
  type: 'leave_status' | 'leave_request' | 'attendance_alert' | 'payroll_update' | 'system';
  message: string;
  is_read: boolean;
  related_entity_id?: string;
  created_at: string;
}

export interface AnalyticsSummary {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  monthlyPayrollTotal: number;
  attendanceRate: number;
  departmentStats: {
    department: string;
    headcount: number;
    presentRate: number;
    avgLeaveDays: number;
  }[];
  attendanceTrends: {
    date: string;
    present: number;
    absent: number;
    leave: number;
    rate: number;
  }[];
  leaveDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
}

export interface AuthResponse {
  user: User;
  profile: Profile;
  accessToken: string;
}
