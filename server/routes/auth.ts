import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb, saveDatabase } from '../db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authRateLimiter,
  authenticate,
  AuthRequest
} from '../auth.js';

const router = Router();

// Password strength validator
function isStrongPassword(pass: string): { valid: boolean; message?: string } {
  if (pass.length < 8) return { valid: false, message: 'Password must be at least 8 characters long.' };
  if (!/[A-Z]/.test(pass)) return { valid: false, message: 'Password must contain at least 1 uppercase letter.' };
  if (!/[0-9]/.test(pass)) return { valid: false, message: 'Password must contain at least 1 numeric digit.' };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return { valid: false, message: 'Password must contain at least 1 special character.' };
  return { valid: true };
}

// Sign Up
router.post('/signup', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { employee_id, email, password, full_name, role = 'employee', department = 'Engineering', job_title = 'Associate Engineer' } = req.body;

    if (!employee_id || !email || !password || !full_name) {
      res.status(400).json({ error: 'Employee ID, email, full name, and password are required.' });
      return;
    }

    const passCheck = isStrongPassword(password);
    if (!passCheck.valid) {
      res.status(400).json({ error: passCheck.message });
      return;
    }

    const db = await getDb();

    // Check unique employee_id
    const existingEmp = db.exec("SELECT id FROM users WHERE employee_id = ?", [employee_id]);
    if (existingEmp[0] && existingEmp[0].values.length > 0) {
      res.status(400).json({ error: 'An account with this Employee ID already exists.' });
      return;
    }

    // Check unique email
    const existingEmail = db.exec("SELECT id FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (existingEmail[0] && existingEmail[0].values.length > 0) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const userId = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === 'admin' ? 'admin' : 'employee';

    // Insert user
    db.run(
      `INSERT INTO users (id, employee_id, email, hashed_password, role, is_email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`,
      [userId, employee_id.trim().toUpperCase(), email.toLowerCase().trim(), hashedPassword, assignedRole]
    );

    // Insert profile
    db.run(
      `INSERT INTO profiles (user_id, full_name, department, job_title, phone, address, date_joined, status)
       VALUES (?, ?, ?, ?, '', '', date('now'), 'active')`,
      [userId, full_name.trim(), department, job_title]
    );

    // Default salary structure
    const defaultBase = assignedRole === 'admin' ? 110000 : 90000;
    const monthlyBase = Math.round(defaultBase / 12);
    db.run(
      `INSERT INTO salary_structures (profile_id, base_salary, allowances, deductions, effective_from)
       VALUES (?, ?, ?, ?, date('now'))`,
      [
        userId,
        defaultBase,
        JSON.stringify({ hra: Math.round(monthlyBase * 0.35), transport: 350, medical: 200, special: Math.round(monthlyBase * 0.1) }),
        JSON.stringify({ provident_fund: Math.round(monthlyBase * 0.08), tax: Math.round(monthlyBase * 0.1), insurance: 150 })
      ]
    );

    // Default leave balances
    const year = new Date().getFullYear();
    db.run(`INSERT INTO leave_balances (id, profile_id, leave_type, total_days, used_days, year) VALUES (?, ?, 'paid', 18, 0, ?)`, [`lb_${userId}_paid`, userId, year]);
    db.run(`INSERT INTO leave_balances (id, profile_id, leave_type, total_days, used_days, year) VALUES (?, ?, 'sick', 10, 0, ?)`, [`lb_${userId}_sick`, userId, year]);
    db.run(`INSERT INTO leave_balances (id, profile_id, leave_type, total_days, used_days, year) VALUES (?, ?, 'unpaid', 5, 0, ?)`, [`lb_${userId}_unpaid`, userId, year]);

    // Create email verification token
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.run(
      `INSERT INTO email_verification_tokens (id, user_id, token, expires_at, used)
       VALUES (?, ?, ?, ?, 0)`,
      [`evt_${crypto.randomUUID().slice(0, 8)}`, userId, token, expiresAt]
    );

    saveDatabase();

    // Log verification link (stubbed email)
    console.log(`[Dayflow Email Service] Verification link for ${email}: /verify-email?token=${token}`);

    res.status(201).json({
      message: 'Account created successfully. Please verify your email to log in.',
      verificationToken: token,
      email: email.toLowerCase().trim()
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Verify Email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Verification token is required.' });
      return;
    }

    const db = await getDb();
    const tokenQuery = db.exec("SELECT id, user_id, expires_at, used FROM email_verification_tokens WHERE token = ?", [token]);
    
    if (!tokenQuery[0] || tokenQuery[0].values.length === 0) {
      res.status(400).json({ error: 'Invalid or expired verification token.' });
      return;
    }

    const [tokenId, userId, expiresAt, used] = tokenQuery[0].values[0];

    if (used) {
      res.status(400).json({ error: 'Verification token has already been used.' });
      return;
    }

    if (new Date(String(expiresAt)) < new Date()) {
      res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
      return;
    }

    // Mark verified
    db.run("UPDATE users SET is_email_verified = 1 WHERE id = ?", [userId]);
    db.run("UPDATE email_verification_tokens SET used = 1 WHERE id = ?", [tokenId]);

    saveDatabase();

    res.json({ message: 'Email verified successfully! You may now sign in.' });
  } catch (err: any) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Failed to verify email.' });
  }
});

// Sign In
router.post('/signin', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both email and password.' });
      return;
    }

    const db = await getDb();
    const userQuery = db.exec("SELECT id, employee_id, email, hashed_password, role, is_email_verified, created_at FROM users WHERE email = ?", [email.toLowerCase().trim()]);

    if (!userQuery[0] || userQuery[0].values.length === 0) {
      // Intentional generic message to prevent account enumeration
      res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
      return;
    }

    const uRow = userQuery[0].values[0];
    const userId = String(uRow[0]);
    const employeeId = String(uRow[1]);
    const userEmail = String(uRow[2]);
    const hashedPassword = String(uRow[3]);
    const role = uRow[4] as 'admin' | 'employee';
    const isEmailVerified = Boolean(uRow[5]);
    const createdAt = String(uRow[6]);

    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
      return;
    }

    if (!isEmailVerified) {
      res.status(403).json({
        error: 'Email verification required. Please check your inbox or click below to verify.',
        needsVerification: true,
        email: userEmail,
        userId: userId
      });
      return;
    }

    // Fetch profile
    const profQuery = db.exec("SELECT * FROM profiles WHERE user_id = ?", [userId]);
    const pRow = profQuery[0]?.values[0] || [];

    const profile = {
      user_id: userId,
      employee_id: employeeId,
      email: userEmail,
      role: role,
      full_name: String(pRow[1] || 'User'),
      department: String(pRow[2] || 'Operations'),
      job_title: String(pRow[3] || 'Staff'),
      phone: String(pRow[4] || ''),
      address: String(pRow[5] || ''),
      profile_picture_file_id: pRow[6] ? String(pRow[6]) : null,
      date_joined: String(pRow[7] || ''),
      status: (pRow[8] || 'active') as 'active' | 'inactive',
      bank_account_no: String(pRow[9] || ''),
      bank_name: String(pRow[10] || ''),
      ifsc_or_routing: String(pRow[11] || '')
    };

    const payload = {
      userId,
      employeeId,
      email: userEmail,
      role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set refresh token in httpOnly cookie
    res.cookie('dayflow_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.cookie('dayflow_access_token', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    res.json({
      accessToken,
      user: {
        id: userId,
        employee_id: employeeId,
        email: userEmail,
        role,
        is_email_verified: isEmailVerified,
        created_at: createdAt
      },
      profile
    });
  } catch (err: any) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// Refresh Token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.dayflow_refresh_token;
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token available.' });
      return;
    }

    const payload = verifyToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired refresh token.' });
      return;
    }

    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      employeeId: payload.employeeId,
      email: payload.email,
      role: payload.role
    });

    res.cookie('dayflow_access_token', newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Refresh failed.' });
  }
});

// Sign Out
router.post('/signout', (req: Request, res: Response) => {
  res.clearCookie('dayflow_refresh_token');
  res.clearCookie('dayflow_access_token');
  res.json({ message: 'Signed out successfully.' });
});

// Current User Me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    user: req.user,
    profile: req.profile
  });
});

export default router;
