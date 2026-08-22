import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb, saveDatabase } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../auth.js';
import { Profile } from '../../src/types/index.js';

const router = Router();

// List Employees (Search & Filters) - Admin sees all, Employees see directory summary
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { search, department, status } = req.query;

    let query = `
      SELECT u.id, u.employee_id, u.email, u.role, u.is_email_verified, u.created_at,
             p.full_name, p.department, p.job_title, p.phone, p.address,
             p.profile_picture_file_id, p.date_joined, p.status,
             p.bank_account_no, p.bank_name, p.ifsc_or_routing
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string') {
      query += ` AND (p.full_name LIKE ? OR u.employee_id LIKE ? OR u.email LIKE ? OR p.job_title LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (department && typeof department === 'string' && department !== 'all') {
      query += ` AND p.department = ?`;
      params.push(department);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.full_name ASC`;

    const result = db.exec(query, params);
    const employees: Profile[] = [];

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        employees.push({
          user_id: String(row[0]),
          employee_id: String(row[1]),
          email: String(row[2]),
          role: row[3] as 'admin' | 'employee',
          full_name: String(row[6]),
          department: String(row[7]),
          job_title: String(row[8]),
          phone: String(row[9] || ''),
          address: String(row[10] || ''),
          profile_picture_file_id: row[11] ? String(row[11]) : null,
          date_joined: String(row[12]),
          status: row[13] as 'active' | 'inactive',
          bank_account_no: req.user?.role === 'admin' || req.user?.id === row[0] ? String(row[14] || '') : '••••••••',
          bank_name: String(row[15] || ''),
          ifsc_or_routing: req.user?.role === 'admin' || req.user?.id === row[0] ? String(row[16] || '') : '••••'
        });
      }
    }

    res.json({ employees });
  } catch (err: any) {
    console.error('List employees error:', err);
    res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// Get single employee by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;

    // Authorization check
    if (req.user?.role !== 'admin' && req.user?.id !== targetUserId) {
      res.status(403).json({ error: 'Forbidden. You do not have permission to view this profile.' });
      return;
    }

    const db = await getDb();
    const query = `
      SELECT u.id, u.employee_id, u.email, u.role, u.is_email_verified, u.created_at,
             p.full_name, p.department, p.job_title, p.phone, p.address,
             p.profile_picture_file_id, p.date_joined, p.status,
             p.bank_account_no, p.bank_name, p.ifsc_or_routing
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `;
    const result = db.exec(query, [targetUserId]);

    if (!result[0] || result[0].values.length === 0) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    const row = result[0].values[0];
    const profile: Profile = {
      user_id: String(row[0]),
      employee_id: String(row[1]),
      email: String(row[2]),
      role: row[3] as 'admin' | 'employee',
      full_name: String(row[6]),
      department: String(row[7]),
      job_title: String(row[8]),
      phone: String(row[9] || ''),
      address: String(row[10] || ''),
      profile_picture_file_id: row[11] ? String(row[11]) : null,
      date_joined: String(row[12]),
      status: row[13] as 'active' | 'inactive',
      bank_account_no: String(row[14] || ''),
      bank_name: String(row[15] || ''),
      ifsc_or_routing: String(row[16] || '')
    };

    // Also get salary structure if admin or owner
    let salary = null;
    const salResult = db.exec("SELECT base_salary, allowances, deductions, effective_from FROM salary_structures WHERE profile_id = ?", [targetUserId]);
    if (salResult[0] && salResult[0].values.length > 0) {
      const sRow = salResult[0].values[0];
      salary = {
        base_salary: Number(sRow[0]),
        allowances: JSON.parse(String(sRow[1] || '{}')),
        deductions: JSON.parse(String(sRow[2] || '{}')),
        effective_from: String(sRow[3])
      };
    }

    res.json({ profile, salary });
  } catch (err: any) {
    console.error('Get employee error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Update Profile
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.id === targetUserId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Forbidden. You cannot edit another employee\'s profile.' });
      return;
    }

    const db = await getDb();

    if (isAdmin) {
      // Admin can update all fields
      const { full_name, department, job_title, phone, address, status, date_joined, bank_account_no, bank_name, ifsc_or_routing } = req.body;
      db.run(
        `UPDATE profiles 
         SET full_name = COALESCE(?, full_name),
             department = COALESCE(?, department),
             job_title = COALESCE(?, job_title),
             phone = COALESCE(?, phone),
             address = COALESCE(?, address),
             status = COALESCE(?, status),
             date_joined = COALESCE(?, date_joined),
             bank_account_no = COALESCE(?, bank_account_no),
             bank_name = COALESCE(?, bank_name),
             ifsc_or_routing = COALESCE(?, ifsc_or_routing)
         WHERE user_id = ?`,
        [full_name, department, job_title, phone, address, status, date_joined, bank_account_no, bank_name, ifsc_or_routing, targetUserId]
      );
    } else {
      // Employee strict allowlist: phone, address, bank info, profile_picture_file_id
      const { phone, address, bank_account_no, bank_name, ifsc_or_routing, profile_picture_file_id } = req.body;
      db.run(
        `UPDATE profiles 
         SET phone = COALESCE(?, phone),
             address = COALESCE(?, address),
             bank_account_no = COALESCE(?, bank_account_no),
             bank_name = COALESCE(?, bank_name),
             ifsc_or_routing = COALESCE(?, ifsc_or_routing),
             profile_picture_file_id = COALESCE(?, profile_picture_file_id)
         WHERE user_id = ?`,
        [phone, address, bank_account_no, bank_name, ifsc_or_routing, profile_picture_file_id, targetUserId]
      );
    }

    saveDatabase();

    // Fetch updated profile
    const updated = db.exec("SELECT * FROM profiles WHERE user_id = ?", [targetUserId]);
    res.json({ message: 'Profile updated successfully.', profile: updated[0]?.values[0] });
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Admin Add Employee
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      employee_id,
      email,
      password = 'Employee@12345',
      full_name,
      department,
      job_title,
      phone = '',
      address = '',
      base_salary = 95000,
      bank_account_no = '',
      bank_name = '',
      ifsc_or_routing = ''
    } = req.body;

    if (!employee_id || !email || !full_name || !department || !job_title) {
      res.status(400).json({ error: 'Employee ID, email, full name, department, and job title are required.' });
      return;
    }

    const db = await getDb();
    const existing = db.exec("SELECT id FROM users WHERE employee_id = ? OR email = ?", [employee_id, email.toLowerCase().trim()]);
    if (existing[0] && existing[0].values.length > 0) {
      res.status(400).json({ error: 'An employee with this ID or email already exists.' });
      return;
    }

    const userId = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.run(
      `INSERT INTO users (id, employee_id, email, hashed_password, role, is_email_verified, created_at)
       VALUES (?, ?, ?, ?, 'employee', 1, datetime('now'))`,
      [userId, employee_id.trim().toUpperCase(), email.toLowerCase().trim(), hashedPassword]
    );

    // Insert profile
    db.run(
      `INSERT INTO profiles (user_id, full_name, department, job_title, phone, address, date_joined, status, bank_account_no, bank_name, ifsc_or_routing)
       VALUES (?, ?, ?, ?, ?, ?, date('now'), 'active', ?, ?, ?)`,
      [userId, full_name.trim(), department, job_title, phone, address, bank_account_no, bank_name, ifsc_or_routing]
    );

    // Salary
    const monthlyBase = Math.round(base_salary / 12);
    db.run(
      `INSERT INTO salary_structures (profile_id, base_salary, allowances, deductions, effective_from)
       VALUES (?, ?, ?, ?, date('now'))`,
      [
        userId,
        base_salary,
        JSON.stringify({ hra: Math.round(monthlyBase * 0.35), transport: 350, medical: 200, special: Math.round(monthlyBase * 0.1) }),
        JSON.stringify({ provident_fund: Math.round(monthlyBase * 0.08), tax: Math.round(monthlyBase * 0.1), insurance: 150 })
      ]
    );

    // Leave balances
    const year = new Date().getFullYear();
    db.run(`INSERT INTO leave_balances (id, profile_id, leave_type, total_days, used_days, year) VALUES (?, ?, 'paid', 18, 0, ?)`, [`lb_${userId}_paid`, userId, year]);
    db.run(`INSERT INTO leave_balances (id, profile_id, leave_type, total_days, used_days, year) VALUES (?, ?, 'sick', 10, 0, ?)`, [`lb_${userId}_sick`, userId, year]);
    db.run(`INSERT INTO leave_balances (id, profile_id, leave_type, total_days, used_days, year) VALUES (?, ?, 'unpaid', 5, 0, ?)`, [`lb_${userId}_unpaid`, userId, year]);

    saveDatabase();

    res.status(201).json({
      message: 'Employee registered successfully.',
      employee: {
        user_id: userId,
        employee_id,
        email,
        full_name,
        department,
        job_title
      }
    });
  } catch (err: any) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Failed to create employee.' });
  }
});

export default router;
