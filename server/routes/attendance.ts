import { Router, Response } from 'express';
import crypto from 'crypto';
import { getDb, saveDatabase } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../auth.js';
import { AttendanceRecord } from '../../src/types/index.js';

const router = Router();

// Helper to get today's YYYY-MM-DD
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get Attendance for Current User (or Admin view for specific employee)
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.employee_id as string) || req.user!.id;
    
    // Check permission
    if (req.user?.role !== 'admin' && req.user?.id !== userId) {
      res.status(403).json({ error: 'Forbidden. You can only view your own attendance.' });
      return;
    }

    const month = (req.query.month as string) || ''; // e.g. 2026-08
    const db = await getDb();

    let query = `
      SELECT a.id, a.profile_id, a.date, a.check_in, a.check_out, a.status, a.notes,
             p.full_name, p.department
      FROM attendance a
      JOIN profiles p ON a.profile_id = p.user_id
      WHERE a.profile_id = ?
    `;
    const params: any[] = [userId];

    if (month) {
      query += ` AND a.date LIKE ?`;
      params.push(`${month}%`);
    }

    query += ` ORDER BY a.date DESC LIMIT 60`;

    const result = db.exec(query, params);
    const records: AttendanceRecord[] = [];

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        records.push({
          id: String(row[0]),
          profile_id: String(row[1]),
          date: String(row[2]),
          check_in: row[3] ? String(row[3]) : null,
          check_out: row[4] ? String(row[4]) : null,
          status: row[5] as any,
          notes: row[6] ? String(row[6]) : null,
          employee_name: String(row[7]),
          department: String(row[8])
        });
      }
    }

    // Today's record
    const today = getTodayDateString();
    const todayRecord = records.find(r => r.date === today) || null;

    // Calculate monthly summary
    const presentCount = records.filter(r => r.status === 'present').length;
    const halfDayCount = records.filter(r => r.status === 'half_day').length;
    const leaveCount = records.filter(r => r.status === 'leave').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    res.json({
      records,
      todayRecord,
      summary: {
        totalRecorded: records.length,
        present: presentCount,
        half_day: halfDayCount,
        leave: leaveCount,
        absent: absentCount
      }
    });
  } catch (err: any) {
    console.error('My attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance.' });
  }
});

// Admin All Attendance (Date range, department, status filters)
router.get('/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { date, department, status, search } = req.query;
    const db = await getDb();

    let query = `
      SELECT a.id, a.profile_id, a.date, a.check_in, a.check_out, a.status, a.notes,
             p.full_name, p.department, u.employee_id
      FROM attendance a
      JOIN profiles p ON a.profile_id = p.user_id
      JOIN users u ON a.profile_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date && typeof date === 'string') {
      query += ` AND a.date = ?`;
      params.push(date);
    }

    if (department && typeof department === 'string' && department !== 'all') {
      query += ` AND p.department = ?`;
      params.push(department);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (search && typeof search === 'string') {
      query += ` AND (p.full_name LIKE ? OR u.employee_id LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s);
    }

    query += ` ORDER BY a.date DESC, p.full_name ASC LIMIT 200`;

    const result = db.exec(query, params);
    const records: any[] = [];

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        records.push({
          id: String(row[0]),
          profile_id: String(row[1]),
          date: String(row[2]),
          check_in: row[3] ? String(row[3]) : null,
          check_out: row[4] ? String(row[4]) : null,
          status: row[5] as any,
          notes: row[6] ? String(row[6]) : null,
          employee_name: String(row[7]),
          department: String(row[8]),
          employee_id: String(row[9])
        });
      }
    }

    res.json({ records });
  } catch (err: any) {
    console.error('All attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

// Employee Check In
router.post('/check-in', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = await getDb();
    const today = getTodayDateString();
    const nowIso = new Date().toISOString();

    // Check if approved leave exists for today
    const leaveCheck = db.exec(
      `SELECT id FROM leave_requests 
       WHERE profile_id = ? AND status = 'approved' AND ? BETWEEN start_date AND end_date`,
      [userId, today]
    );

    if (leaveCheck[0] && leaveCheck[0].values.length > 0) {
      res.status(400).json({ error: 'You are currently on approved leave for today.' });
      return;
    }

    // Check existing record for today
    const existing = db.exec("SELECT id, check_in FROM attendance WHERE profile_id = ? AND date = ?", [userId, today]);
    
    if (existing[0] && existing[0].values.length > 0) {
      const row = existing[0].values[0];
      if (row[1]) {
        res.status(400).json({ error: 'You have already checked in for today.' });
        return;
      }

      // Update check-in time
      db.run("UPDATE attendance SET check_in = ?, status = 'present' WHERE id = ?", [nowIso, row[0]]);
    } else {
      // Insert new record
      const attId = `att_${userId}_${today}`;
      db.run(
        `INSERT INTO attendance (id, profile_id, date, check_in, check_out, status)
         VALUES (?, ?, ?, ?, NULL, 'present')`,
        [attId, userId, today, nowIso]
      );
    }

    saveDatabase();

    res.json({
      message: 'Checked in successfully! Have a productive workday.',
      check_in: nowIso,
      date: today
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to record check-in.' });
  }
});

// Employee Check Out
router.post('/check-out', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = await getDb();
    const today = getTodayDateString();
    const nowIso = new Date().toISOString();

    const existing = db.exec("SELECT id, check_in, check_out FROM attendance WHERE profile_id = ? AND date = ?", [userId, today]);

    if (!existing[0] || existing[0].values.length === 0 || !existing[0].values[0][1]) {
      res.status(400).json({ error: 'You must check in first before checking out.' });
      return;
    }

    const row = existing[0].values[0];
    const attId = String(row[0]);
    const checkInTime = new Date(String(row[1])).getTime();
    const checkOutTime = new Date(nowIso).getTime();

    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const status = hoursWorked < 4 ? 'half_day' : 'present';

    db.run("UPDATE attendance SET check_out = ?, status = ? WHERE id = ?", [nowIso, status, attId]);
    saveDatabase();

    res.json({
      message: `Checked out successfully! Total work time: ${hoursWorked.toFixed(1)} hours.`,
      check_out: nowIso,
      hours_worked: Number(hoursWorked.toFixed(2)),
      status
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    res.status(500).json({ error: 'Failed to record check-out.' });
  }
});

// Admin Manual Override / Record
router.post('/record', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { profile_id, date, status, check_in, check_out, notes } = req.body;

    if (!profile_id || !date || !status) {
      res.status(400).json({ error: 'Employee, date, and status are required.' });
      return;
    }

    const db = await getDb();
    const attId = `att_${profile_id}_${date}`;

    db.run(
      `INSERT INTO attendance (id, profile_id, date, check_in, check_out, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(profile_id, date) DO UPDATE SET
         check_in = excluded.check_in,
         check_out = excluded.check_out,
         status = excluded.status,
         notes = excluded.notes`,
      [attId, profile_id, date, check_in || null, check_out || null, status, notes || 'Admin adjustment']
    );

    saveDatabase();
    res.json({ message: 'Attendance record updated successfully.' });
  } catch (err: any) {
    console.error('Admin attendance record error:', err);
    res.status(500).json({ error: 'Failed to save attendance record.' });
  }
});

export default router;
