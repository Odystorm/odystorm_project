import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import { pushSubscriptionSchema } from '@odystorm/shared';
import { requireAuth, type AuthSessionVariables } from '../middleware/session';
import { sqlite } from '../db';
import { getVapidPublicKey } from '../services/push';
import { registerSseListener } from '../ws/hub';

export const notificationRoutes = new Hono<{ Variables: AuthSessionVariables }>();

notificationRoutes.use('*', requireAuth);

notificationRoutes.get('/', (c) => {
  const userId = c.get('userId');

  const items = sqlite
    .query(
      `SELECT id, kind, title, body, is_read as isRead, created_at as createdAt
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    )
    .all(userId) as Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
    isRead: number;
    createdAt: number;
  }>;

  const announcements = sqlite
    .query(
      `SELECT id, title, body, media_url as mediaUrl, media_type as mediaType, created_at as createdAt
       FROM announcements
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .all();

  const pushCount = sqlite
    .query('SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ?')
    .get(userId) as { count: number };

  return c.json({
    notifications: items.map((n) => ({
      ...n,
      isRead: Boolean(n.isRead),
    })),
    announcements,
    vapidPublicKey: getVapidPublicKey(),
    pushEnabled: pushCount.count > 0,
  });
});

notificationRoutes.post('/read-all', (c) => {
  const userId = c.get('userId');
  sqlite.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  return c.json({ ok: true });
});

notificationRoutes.post('/push/subscribe', zValidator('json', pushSubscriptionSchema), (c) => {
  const userId = c.get('userId');
  const { endpoint, keys } = c.req.valid('json');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth`
    )
    .run(`push_${nanoid(12)}`, userId, endpoint, keys.p256dh, keys.auth, now);

  return c.json({ subscribed: true });
});

notificationRoutes.delete('/push/unsubscribe', (c) => {
  const userId = c.get('userId');
  sqlite.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);
  return c.json({ subscribed: false });
});

notificationRoutes.get('/stream', (c) => {
  const userId = c.get('userId');

  return streamSSE(c, async (stream) => {
    let closed = false;
    const unsubscribe = registerSseListener(userId, (payload) => {
      if (closed) return;
      void stream.writeSSE({
        event: payload.type,
        data: JSON.stringify(payload.data),
      });
    });

    stream.onAbort(() => {
      closed = true;
      unsubscribe();
    });

    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ userId, ts: Date.now() }),
    });

    while (!closed) {
      await stream.sleep(25_000);
      if (!closed) {
        await stream.writeSSE({
          event: 'ping',
          data: String(Date.now()),
        });
      }
    }
  });
});
