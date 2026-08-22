import { Router, Response } from 'express';
import crypto from 'crypto';
import { getDb, saveDatabase } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../auth.js';
import { broadcastToUser, broadcastToRole } from '../websocket.js';
import { LeaveRequest, LeaveBalance } from '../../src/types/index.js';

const router = Router();

// Helper to calculate days between two dates inclusive
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

// Get Leave Balances for user
router.get('/balances', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = (req.query.employee_id as string) || req.user!.id;

    if (req.user?.role !== 'admin' && req.user?.id !== targetUserId) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    const db = await getDb();
    const currentYear = new Date().getFullYear();
    const result = db.exec(
      `SELECT id, profile_id, leave_type, total_days, used_days, year 
       FROM leave_balances 
       WHERE profile_id = ? AND year = ?`,
      [targetUserId, currentYear]
    );

    const balances: LeaveBalance[] = [];
    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        const total = Number(row[3]);
        const used = Number(row[4]);
        balances.push({
          id: String(row[0]),
          profile_id: String(row[1]),
          leave_type: row[2] as any,
          total_days: total,
          used_days: used,
          remaining_days: Math.max(0, total - used),
          year: Number(row[5])
        });
      }
    }

    res.json({ balances });
  } catch (err: any) {
    console.error('Leave balances error:', err);
    res.status(500).json({ error: 'Failed to fetch leave balances.' });
  }
});

// Get My Leave Requests
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = await getDb();

    const query = `
      SELECT lr.id, lr.profile_id, lr.leave_type, lr.start_date, lr.end_date, 
             lr.days_count, lr.remarks, lr.status, lr.reviewed_by, 
             lr.review_comment, lr.reviewed_at, lr.created_at,
             p.full_name as employee_name, rev_p.full_name as reviewer_name
      FROM leave_requests lr
      JOIN profiles p ON lr.profile_id = p.user_id
      LEFT JOIN profiles rev_p ON lr.reviewed_by = rev_p.user_id
      WHERE lr.profile_id = ?
      ORDER BY lr.created_at DESC
    `;
    const result = db.exec(query, [userId]);
    const requests: LeaveRequest[] = [];

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        requests.push({
          id: String(row[0]),
          profile_id: String(row[1]),
          leave_type: row[2] as any,
          start_date: String(row[3]),
          end_date: String(row[4]),
          days_count: Number(row[5]),
          remarks: String(row[6]),
          status: row[7] as any,
          reviewed_by: row[8] ? String(row[8]) : null,
          review_comment: row[9] ? String(row[9]) : null,
          reviewed_at: row[10] ? String(row[10]) : null,
          created_at: String(row[11]),
          employee_name: String(row[12]),
          reviewer_name: row[13] ? String(row[13]) : null
        });
      }
    }

    res.json({ requests });
  } catch (err: any) {
    console.error('My leave requests error:', err);
    res.status(500).json({ error: 'Failed to fetch leave requests.' });
  }
});

// Admin Get All Leave Requests Queue
router.get('/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, department, search } = req.query;
    const db = await getDb();

    let query = `
      SELECT lr.id, lr.profile_id, lr.leave_type, lr.start_date, lr.end_date, 
             lr.days_count, lr.remarks, lr.status, lr.reviewed_by, 
             lr.review_comment, lr.reviewed_at, lr.created_at,
             p.full_name as employee_name, u.employee_id, p.department,
             rev_p.full_name as reviewer_name
      FROM leave_requests lr
      JOIN profiles p ON lr.profile_id = p.user_id
      JOIN users u ON lr.profile_id = u.id
      LEFT JOIN profiles rev_p ON lr.reviewed_by = rev_p.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND lr.status = ?`;
      params.push(status);
    }

    if (department && typeof department === 'string' && department !== 'all') {
      query += ` AND p.department = ?`;
      params.push(department);
    }

    if (search && typeof search === 'string') {
      query += ` AND (p.full_name LIKE ? OR u.employee_id LIKE ? OR lr.remarks LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY CASE WHEN lr.status = 'pending' THEN 0 ELSE 1 END, lr.created_at DESC`;

    const result = db.exec(query, params);
    const requests: LeaveRequest[] = [];

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        requests.push({
          id: String(row[0]),
          profile_id: String(row[1]),
          leave_type: row[2] as any,
          start_date: String(row[3]),
          end_date: String(row[4]),
          days_count: Number(row[5]),
          remarks: String(row[6]),
          status: row[7] as any,
          reviewed_by: row[8] ? String(row[8]) : null,
          review_comment: row[9] ? String(row[9]) : null,
          reviewed_at: row[10] ? String(row[10]) : null,
          created_at: String(row[11]),
          employee_name: String(row[12]),
          employee_id: String(row[13]),
          department: String(row[14]),
          reviewer_name: row[15] ? String(row[15]) : null
        });
      }
    }

    res.json({ requests });
  } catch (err: any) {
    console.error('All leave requests error:', err);
    res.status(500).json({ error: 'Failed to fetch leave requests.' });
  }
});

// Apply for Leave (Employee)
router.post('/apply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { leave_type, start_date, end_date, remarks } = req.body;

    if (!leave_type || !start_date || !end_date || !remarks) {
      res.status(400).json({ error: 'Leave type, start date, end date, and remarks are required.' });
      return;
    }

    if (new Date(end_date) < new Date(start_date)) {
      res.status(400).json({ error: 'End date cannot be earlier than start date.' });
      return;
    }

    const daysCount = calculateDays(start_date, end_date);
    const db = await getDb();
    const currentYear = new Date().getFullYear();

    // Check balance if paid or sick
    if (leave_type === 'paid' || leave_type === 'sick') {
      const balQuery = db.exec(
        `SELECT total_days, used_days FROM leave_balances 
         WHERE profile_id = ? AND leave_type = ? AND year = ?`,
        [userId, leave_type, currentYear]
      );

      if (balQuery[0] && balQuery[0].values.length > 0) {
        const [total, used] = balQuery[0].values[0];
        const remaining = Number(total) - Number(used);
        if (daysCount > remaining) {
          res.status(400).json({
            error: `Insufficient ${leave_type} leave balance. You requested ${daysCount} day(s), but have only ${remaining} day(s) remaining.`
          });
          return;
        }
      }
    }

    const reqId = `lr_${crypto.randomUUID().slice(0, 8)}`;
    db.run(
      `INSERT INTO leave_requests (id, profile_id, leave_type, start_date, end_date, days_count, remarks, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [reqId, userId, leave_type, start_date, end_date, daysCount, remarks.trim()]
    );

    // Create notification for HR Admins
    const notifMsg = `${req.profile?.full_name || 'An employee'} applied for ${daysCount} day(s) ${leave_type} leave (${start_date} to ${end_date}).`;
    
    // Find all admin IDs
    const admins = db.exec("SELECT id FROM users WHERE role = 'admin'");
    if (admins[0] && admins[0].values) {
      for (const aRow of admins[0].values) {
        const adminId = String(aRow[0]);
        db.run(
          `INSERT INTO notifications (id, profile_id, type, message, is_read, related_entity_id, created_at)
           VALUES (?, ?, 'leave_request', ?, 0, ?, datetime('now'))`,
          [`notif_${crypto.randomUUID().slice(0, 8)}`, adminId, notifMsg, reqId]
        );
      }
    }

    saveDatabase();

    // Broadcast to Admins via WebSocket
    broadcastToRole('admin', {
      type: 'new_leave_request',
      data: {
        id: reqId,
        employee_name: req.profile?.full_name,
        department: req.profile?.department,
        leave_type,
        start_date,
        end_date,
        days_count: daysCount,
        remarks
      }
    });

    console.log(`[Dayflow Realtime] Broadcasted new leave request ${reqId} to admins.`);

    res.status(201).json({
      message: 'Leave application submitted successfully. Pending HR review.',
      requestId: reqId
    });
  } catch (err: any) {
    console.error('Apply leave error:', err);
    res.status(500).json({ error: 'Failed to submit leave application.' });
  }
});

// Admin Review Leave (Approve / Reject)
router.post('/review', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const reviewerId = req.user!.id;
    const { request_id, status, comment } = req.body;

    if (!request_id || !status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Request ID and a valid status (approved/rejected) are required.' });
      return;
    }

    const db = await getDb();
    const reqQuery = db.exec(
      `SELECT id, profile_id, leave_type, start_date, end_date, days_count, status
       FROM leave_requests WHERE id = ?`,
      [request_id]
    );

    if (!reqQuery[0] || reqQuery[0].values.length === 0) {
      res.status(404).json({ error: 'Leave request not found.' });
      return;
    }

    const [id, profileId, leaveType, startDate, endDate, daysCount, currentStatus] = reqQuery[0].values[0];

    if (currentStatus !== 'pending') {
      res.status(400).json({ error: `This request has already been ${currentStatus}.` });
      return;
    }

    const nowIso = new Date().toISOString();

    // Update leave request
    db.run(
      `UPDATE leave_requests 
       SET status = ?, reviewed_by = ?, review_comment = ?, reviewed_at = ?
       WHERE id = ?`,
      [status, reviewerId, comment || null, nowIso, request_id]
    );

    // If approved, recalculate leave balances & update attendance calendar
    if (status === 'approved') {
      const year = new Date(String(startDate)).getFullYear();
      db.run(
        `UPDATE leave_balances 
         SET used_days = used_days + ?
         WHERE profile_id = ? AND leave_type = ? AND year = ?`,
        [Number(daysCount), String(profileId), String(leaveType), year]
      );

      // Populate attendance days with 'leave' status
      const start = new Date(String(startDate));
      const end = new Date(String(endDate));
      const cur = new Date(start);

      while (cur <= end) {
        // Skip weekend
        if (cur.getDay() !== 0 && cur.getDay() !== 6) {
          const dateStr = cur.toISOString().split('T')[0];
          const attId = `att_${profileId}_${dateStr}`;
          db.run(
            `INSERT INTO attendance (id, profile_id, date, check_in, check_out, status, notes)
             VALUES (?, ?, ?, NULL, NULL, 'leave', ?)
             ON CONFLICT(profile_id, date) DO UPDATE SET status = 'leave', notes = ?`,
            [attId, String(profileId), dateStr, `Approved ${leaveType} leave`, `Approved ${leaveType} leave`]
          );
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // In-app notification for employee
    const notifMsg = `Your ${leaveType} leave request for ${startDate} to ${endDate} was ${status} by HR.${comment ? ` Note: "${comment}"` : ''}`;
    db.run(
      `INSERT INTO notifications (id, profile_id, type, message, is_read, related_entity_id, created_at)
       VALUES (?, ?, 'leave_status', ?, 0, ?, datetime('now'))`,
      [`notif_${crypto.randomUUID().slice(0, 8)}`, String(profileId), notifMsg, request_id]
    );

    saveDatabase();

    // Broadcast instant update to Employee's session via WebSocket
    broadcastToUser(String(profileId), {
      type: 'leave_status_updated',
      data: {
        id: request_id,
        status,
        comment,
        reviewed_at: nowIso,
        reviewer_name: req.profile?.full_name
      }
    });

    // Also broadcast to all admins to sync their queue
    broadcastToRole('admin', {
      type: 'leave_queue_updated',
      data: { id: request_id, status }
    });

    console.log(`[Dayflow Email Service] Notification email logged for user ${profileId}: ${notifMsg}`);

    res.json({
      message: `Leave request ${status} successfully.`,
      request_id,
      status
    });
  } catch (err: any) {
    console.error('Review leave error:', err);
    res.status(500).json({ error: 'Failed to process leave review.' });
  }
});

export default router;
