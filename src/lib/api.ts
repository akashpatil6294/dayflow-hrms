import {
  User,
  Profile,
  AttendanceRecord,
  LeaveRequest,
  LeaveBalance,
  SalaryStructure,
  DocumentItem,
  NotificationItem,
  AnalyticsSummary,
  AuthResponse
} from '../types/index.js';

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {
      // keep fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  auth: {
    signIn: (credentials: { email: string; password: string }) =>
      request<AuthResponse>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),
    signUp: (data: any) =>
      request<{ message: string; verificationToken: string; email: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    verifyEmail: (token: string) =>
      request<{ message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
      }),
    me: () => request<{ user: User; profile: Profile }>('/api/auth/me'),
    signOut: () =>
      request<{ message: string }>('/api/auth/signout', {
        method: 'POST'
      }),
    refreshToken: () =>
      request<{ accessToken: string }>('/api/auth/refresh', {
        method: 'POST'
      })
  },

  employees: {
    list: (params?: { search?: string; department?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.department) qs.set('department', params.department);
      if (params?.status) qs.set('status', params.status);
      return request<{ employees: Profile[] }>(`/api/employees?${qs.toString()}`);
    },
    get: (id: string) => request<{ profile: Profile; salary?: any }>(`/api/employees/${id}`),
    update: (id: string, data: Partial<Profile>) =>
      request<{ message: string; profile: Profile }>(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    create: (data: any) =>
      request<{ message: string; employee: any }>('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  attendance: {
    my: (month?: string, employeeId?: string) => {
      const qs = new URLSearchParams();
      if (month) qs.set('month', month);
      if (employeeId) qs.set('employee_id', employeeId);
      return request<{ records: AttendanceRecord[]; todayRecord: AttendanceRecord | null; summary: any }>(
        `/api/attendance/my?${qs.toString()}`
      );
    },
    all: (params?: { date?: string; department?: string; status?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.date) qs.set('date', params.date);
      if (params?.department) qs.set('department', params.department);
      if (params?.status) qs.set('status', params.status);
      if (params?.search) qs.set('search', params.search);
      return request<{ records: any[] }>(`/api/attendance/all?${qs.toString()}`);
    },
    checkIn: () =>
      request<{ message: string; check_in: string; date: string }>('/api/attendance/check-in', {
        method: 'POST'
      }),
    checkOut: () =>
      request<{ message: string; check_out: string; hours_worked: number; status: string }>(
        '/api/attendance/check-out',
        {
          method: 'POST'
        }
      ),
    record: (data: any) =>
      request<{ message: string }>('/api/attendance/record', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  leave: {
    balances: (employeeId?: string) => {
      const qs = employeeId ? `?employee_id=${employeeId}` : '';
      return request<{ balances: LeaveBalance[] }>(`/api/leave/balances${qs}`);
    },
    my: () => request<{ requests: LeaveRequest[] }>('/api/leave/my'),
    all: (params?: { status?: string; department?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.department) qs.set('department', params.department);
      if (params?.search) qs.set('search', params.search);
      return request<{ requests: LeaveRequest[] }>(`/api/leave/all?${qs.toString()}`);
    },
    apply: (data: { leave_type: string; start_date: string; end_date: string; remarks: string }) =>
      request<{ message: string; requestId: string }>('/api/leave/apply', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    review: (data: { request_id: string; status: 'approved' | 'rejected'; comment?: string }) =>
      request<{ message: string; request_id: string; status: string }>('/api/leave/review', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  payroll: {
    my: (employeeId?: string) => {
      const qs = employeeId ? `?employee_id=${employeeId}` : '';
      return request<{ payroll: any }>(`/api/payroll/my${qs}`);
    },
    all: (params?: { department?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.department) qs.set('department', params.department);
      if (params?.search) qs.set('search', params.search);
      return request<{ payrollList: any[]; summary: any }>(`/api/payroll/all?${qs.toString()}`);
    },
    updateStructure: (id: string, data: any) =>
      request<{ message: string }>(`/api/payroll/structure/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    integrityCheck: () => request<any>('/api/payroll/integrity-check'),
    downloadSlipUrl: (userId: string, month: string = 'August 2026') =>
      `/api/payroll/salary-slip/${userId}?month=${encodeURIComponent(month)}`
  },

  analytics: {
    summary: () => request<AnalyticsSummary>('/api/analytics/summary')
  },

  documents: {
    list: (profileId?: string) => {
      const qs = profileId ? `?profile_id=${profileId}` : '';
      return request<{ documents: DocumentItem[] }>(`/api/documents${qs}`);
    },
    upload: async (file: File, profileId?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (profileId) formData.append('profile_id', profileId);

      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload document');
      }
      return res.json();
    },
    uploadAvatar: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/documents/avatar', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload profile picture');
      }
      return res.json();
    },
    downloadUrl: (fileId: string) => `/api/documents/download/${fileId}`
  },

  notifications: {
    list: () => request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),
    markRead: (id: string) => request<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request<{ message: string }>('/api/notifications/mark-all-read', { method: 'POST' })
  },

  demo: {
    reset: () => request<{ message: string }>('/api/notifications/reset-demo', { method: 'POST' })
  }
};
