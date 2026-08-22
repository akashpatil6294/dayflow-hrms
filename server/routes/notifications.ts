import { Router, Response } from 'express';
import { getDb, saveDatabase, seedDatabase } from '../db.js';
import { authenticate, requireAdmin, AuthRequest } from '../auth.js';
import { NotificationItem } from '../../src/types/index.js';

const router = Router();

// Get Notifications for Current User
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = await getDb();

    const query = `
      SELECT id, profile_id, type, message, is_read, related_entity_id, created_at
      FROM notifications
      WHERE profile_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = db.exec(query, [userId]);
    const notifications: NotificationItem[] = [];
    let unreadCount = 0;

    if (result[0] && result[0].values) {
      for (const row of result[0].values) {
        const isRead = Boolean(row[4]);
        if (!isRead) unreadCount++;

        notifications.push({
          id: String(row[0]),
          profile_id: String(row[1]),
          type: row[2] as any,
          message: String(row[3]),
          is_read: isRead,
          related_entity_id: row[5] ? String(row[5]) : undefined,
          created_at: String(row[6])
        });
      }
    }

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark Single Notification as Read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifId = req.params.id;
    const userId = req.user!.id;
    const db = await getDb();

    db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND profile_id = ?", [notifId, userId]);
    saveDatabase();

    res.json({ message: 'Notification marked as read.' });
  } catch (err: any) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Mark All as Read
router.post('/mark-all-read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = await getDb();

    db.run("UPDATE notifications SET is_read = 1 WHERE profile_id = ?", [userId]);
    saveDatabase();

    res.json({ message: 'All notifications marked as read.' });
  } catch (err: any) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// Demo Helper: Reset Database to Seed State
router.post('/reset-demo', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    await seedDatabase(db);
    res.json({ message: 'Database reset to initial demo state with 15 employees, attendance records, and leave requests.' });
  } catch (err: any) {
    console.error('Reset demo error:', err);
    res.status(500).json({ error: 'Failed to reset demo database.' });
  }
});

export default router;
