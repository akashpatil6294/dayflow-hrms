import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from './db.js';
import { User, Profile } from '../src/types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dayflow_hrms_super_secure_jwt_secret_key_2025';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface AuthRequest extends Request {
  user?: User;
  profile?: Profile;
}

export interface JwtPayload {
  userId: string;
  employeeId: string;
  email: string;
  role: 'admin' | 'employee';
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// In-memory rate limiting for auth endpoints (max 10 requests per minute per IP)
const authAttempts = new Map<string, { count: number; firstAttempt: number }>();

export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 15;

  const current = authAttempts.get(ip);
  if (!current || now - current.firstAttempt > windowMs) {
    authAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (current.count >= maxAttempts) {
    res.status(429).json({ error: 'Too many authentication attempts. Please wait a minute and try again.' });
    return;
  }

  current.count++;
  next();
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.dayflow_access_token) {
    token = req.cookies.dayflow_access_token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  const db = await getDb();
  const userQuery = db.exec("SELECT id, employee_id, email, role, is_email_verified, created_at FROM users WHERE id = ?", [payload.userId]);
  
  if (!userQuery[0] || userQuery[0].values.length === 0) {
    res.status(401).json({ error: 'User account no longer exists.' });
    return;
  }

  const uRow = userQuery[0].values[0];
  const user: User = {
    id: String(uRow[0]),
    employee_id: String(uRow[1]),
    email: String(uRow[2]),
    role: uRow[3] as 'admin' | 'employee',
    is_email_verified: Boolean(uRow[4]),
    created_at: String(uRow[5])
  };

  const profQuery = db.exec("SELECT * FROM profiles WHERE user_id = ?", [payload.userId]);
  let profile: Profile | undefined;
  if (profQuery[0] && profQuery[0].values.length > 0) {
    const pRow = profQuery[0].values[0];
    profile = {
      user_id: String(pRow[0]),
      employee_id: user.employee_id,
      email: user.email,
      role: user.role,
      full_name: String(pRow[1]),
      department: String(pRow[2]),
      job_title: String(pRow[3]),
      phone: String(pRow[4] || ''),
      address: String(pRow[5] || ''),
      profile_picture_file_id: pRow[6] ? String(pRow[6]) : null,
      date_joined: String(pRow[7]),
      status: pRow[8] as 'active' | 'inactive',
      bank_account_no: String(pRow[9] || ''),
      bank_name: String(pRow[10] || ''),
      ifsc_or_routing: String(pRow[11] || '')
    };
  }

  req.user = user;
  req.profile = profile;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin privileges are required to perform this action.' });
    return;
  }
  next();
}

export function requireOwnerOrAdmin(getResourceOwnerId: (req: AuthRequest) => string | Promise<string>) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const ownerId = await getResourceOwnerId(req);
    if (req.user.id !== ownerId) {
      res.status(403).json({ error: 'Forbidden. You cannot access or modify another employee\'s resource.' });
      return;
    }

    next();
  };
}
