import webpush from 'web-push';
import { nanoid } from 'nanoid';
import { sqlite } from '../db';
import { emitToUser, broadcastToAll } from '../ws/hub';

interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

let cachedVapid: VapidConfig | null = null;

function ensureVapidConfigured(): VapidConfig {
  if (cachedVapid) return cachedVapid;

  const subject = process.env.VAPID_SUBJECT || 'mailto:ops@odystorm.xyz';
  let publicKey = process.env.VAPID_PUBLIC_KEY || '';
  let privateKey = process.env.VAPID_PRIVATE_KEY || '';

  if (!publicKey || !privateKey) {
    const storedPub = sqlite
      .query("SELECT value FROM system_settings WHERE key = 'vapid_public_key'")
      .get() as { value: string } | null;
    const storedPriv = sqlite
      .query("SELECT value FROM system_settings WHERE key = 'vapid_private_key'")
      .get() as { value: string } | null;

    if (storedPub?.value && storedPriv?.value) {
      publicKey = storedPub.value;
      privateKey = storedPriv.value;
    } else {
      const generated = webpush.generateVAPIDKeys();
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
      const now = Date.now();
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('vapid_public_key', ?, ?)`
        )
        .run(publicKey, now);
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('vapid_private_key', ?, ?)`
        )
        .run(privateKey, now);
    }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  cachedVapid = { publicKey, privateKey, subject };
  return cachedVapid;
}

export function getVapidPublicKey(): string {
  return ensureVapidConfigured().publicKey;
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  ensureVapidConfigured();
  const subs = sqlite
    .query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?')
    .all(userId) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;

  if (subs.length === 0) return;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
  });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          sqlite.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        }
      }
    })
  );
}

export async function broadcastWebPush(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<number> {
  ensureVapidConfigured();
  const subs = sqlite
    .query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions')
    .all() as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;

  if (subs.length === 0) return 0;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/inbox',
  });

  let delivered = 0;
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
        delivered += 1;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          sqlite.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        }
      }
    })
  );
  return delivered;
}

export function createNotification(
  userId: string,
  kind:
    | 'mining_complete'
    | 'referral_joined'
    | 'referral_commission'
    | 'daily_streak'
    | 'broadcast'
    | 'system',
  title: string,
  body: string,
  options?: { sendPush?: boolean; url?: string }
): { id: string; createdAt: number } {
  const id = `ntf_${nanoid(12)}`;
  const createdAt = Date.now();

  sqlite
    .prepare(
      `INSERT INTO notifications (id, user_id, kind, title, body, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    )
    .run(id, userId, kind, title, body, createdAt);

  emitToUser(userId, {
    type: 'notification',
    data: { id, kind, title, body, isRead: false, createdAt },
  });

  if (options?.sendPush) {
    void sendWebPushToUser(userId, { title, body, url: options.url });
  }

  return { id, createdAt };
}

export function broadcastAnnouncementRealtime(announcement: {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string;
  createdAt: number;
}): void {
  broadcastToAll({
    type: 'announcement',
    data: announcement,
  });
}
