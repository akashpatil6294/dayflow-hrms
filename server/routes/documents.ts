import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getDb, saveDatabase } from '../db.js';
import { authenticate, AuthRequest } from '../auth.js';
import { DocumentItem } from '../../src/types/index.js';

const router = Router();

const STORAGE_ROOT = path.join(process.cwd(), 'storage');
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const authReq = req as AuthRequest;
    const userId = (req.body.profile_id as string) || authReq.user?.id || 'general';
    const userDir = path.join(STORAGE_ROOT, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}_${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|docx|txt/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, DOCX, and TXT files are allowed.'));
    }
  }
});

// List Documents for employee
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = (req.query.profile_id as string) || req.user!.id;

    if (req.user?.role !== 'admin' && req.user?.id !== targetUserId) {
      res.status(403).json({ error: 'Forbidden. You can only view your own documents.' });
      return;
    }

    const db = await getDb();
    const query = `
      SELECT d.id, d.profile_id, d.file_name, d.file_type, d.file_size, d.storage_path, d.uploaded_at, d.uploaded_by,
             p.full_name as uploader_name
      FROM documents d
      LEFT JOIN profiles p ON d.uploaded_by = p.user_id
      WHERE d.profile_id = ?
      ORDER BY d.uploaded_at DESC
    `;
    const result = db.exec(query, [targetUserId]);
    const documents: DocumentItem[] = [];

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        documents.push({
          id: String(row[0]),
          profile_id: String(row[1]),
          file_name: String(row[2]),
          file_type: String(row[3]),
          file_size: Number(row[4]),
          storage_path: String(row[5]),
          uploaded_at: String(row[6]),
          uploaded_by: String(row[7]),
          uploader_name: row[8] ? String(row[8]) : 'System Admin'
        });
      }
    }

    res.json({ documents });
  } catch (err: any) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// Upload Document
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    const targetUserId = (req.body.profile_id as string) || req.user!.id;

    if (req.user?.role !== 'admin' && req.user?.id !== targetUserId) {
      res.status(403).json({ error: 'Forbidden. You cannot upload documents for other employees.' });
      return;
    }

    const docId = `doc_${crypto.randomUUID().slice(0, 8)}`;
    const relativePath = `${targetUserId}/${req.file.filename}`;

    const db = await getDb();
    db.run(
      `INSERT INTO documents (id, profile_id, file_name, file_type, file_size, storage_path, uploaded_at, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      [
        docId,
        targetUserId,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        relativePath,
        req.user!.id
      ]
    );

    saveDatabase();

    res.status(201).json({
      message: 'Document uploaded successfully.',
      document: {
        id: docId,
        profile_id: targetUserId,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: req.user!.id
      }
    });
  } catch (err: any) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload document.' });
  }
});

// Upload Profile Picture
router.post('/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No avatar image was uploaded.' });
      return;
    }

    const userId = req.user!.id;
    const docId = `avatar_${crypto.randomUUID().slice(0, 8)}`;
    const relativePath = `${userId}/${req.file.filename}`;

    const db = await getDb();
    db.run(
      `INSERT INTO documents (id, profile_id, file_name, file_type, file_size, storage_path, uploaded_at, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      [docId, userId, req.file.originalname, req.file.mimetype, req.file.size, relativePath, userId]
    );

    // Update profile
    db.run("UPDATE profiles SET profile_picture_file_id = ? WHERE user_id = ?", [docId, userId]);
    saveDatabase();

    res.json({
      message: 'Profile picture updated successfully.',
      file_id: docId
    });
  } catch (err: any) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture.' });
  }
});

// Authenticated File Streaming Endpoint - /api/files/:fileId
router.get('/download/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const db = await getDb();

    const query = db.exec("SELECT profile_id, file_name, file_type, storage_path FROM documents WHERE id = ?", [fileId]);

    if (!query[0] || query[0].values.length === 0) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const [profileId, fileName, fileType, storagePath] = query[0].values[0];

    // Authorization check
    if (req.user?.role !== 'admin' && req.user?.id !== String(profileId)) {
      res.status(403).json({ error: 'Forbidden. You do not have permission to access this document.' });
      return;
    }

    const absolutePath = path.join(STORAGE_ROOT, String(storagePath));

    if (!fs.existsSync(absolutePath)) {
      // If sample seeded file, generate on the fly or provide sample content
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(`Dayflow HRMS Sample Document: ${fileName}\nConfidential record for Employee ID: ${profileId}\nGenerated for Hackathon verification.`);
      return;
    }

    res.setHeader('Content-Type', String(fileType) || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('File download error:', err);
    res.status(500).json({ error: 'Failed to retrieve file.' });
  }
});

export default router;
