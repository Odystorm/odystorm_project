import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { applyReferralSchema, updateProfileSchema } from '@odystorm/shared';
import { requireAuth, type AuthSessionVariables } from '../middleware/session';
import { ensurePlayerInitialized, getFullPlayerSnapshot } from '../services/player';
import { getEnabledSocialProviders } from '../auth';
import { getVapidPublicKey } from '../services/push';
import { sqlite } from '../db';

export const playerRoutes = new Hono<{ Variables: AuthSessionVariables }>();

playerRoutes.get('/config', (c) => {
  return c.json({
    enabledSocialProviders: getEnabledSocialProviders(),
    vapidPublicKey: getVapidPublicKey(),
  });
});

playerRoutes.use('*', requireAuth);

playerRoutes.get('/me', (c) => {
  const userId = c.get('userId');
  const snapshot = getFullPlayerSnapshot(userId);
  return c.json({
    ...snapshot,
    enabledSocialProviders: getEnabledSocialProviders(),
    vapidPublicKey: getVapidPublicKey(),
  });
});

playerRoutes.post('/referral/apply', zValidator('json', applyReferralSchema), (c) => {
  const userId = c.get('userId');
  const { referralCode } = c.req.valid('json');
  const normalized = referralCode.trim().toUpperCase();

  const currentUser = sqlite
    .query('SELECT referral_code, referred_by_user_id FROM user WHERE id = ?')
    .get(userId) as { referral_code: string; referred_by_user_id: string | null } | null;

  if (!currentUser) {
    return c.json({ error: 'Player not found' }, 404);
  }

  if (currentUser.referred_by_user_id) {
    return c.json({ applied: false, message: 'Referral commander already linked.' });
  }

  if (currentUser.referral_code.toUpperCase() === normalized) {
    return c.json({ error: 'Cannot apply your own invite code.' }, 400);
  }

  const referrer = sqlite
    .query('SELECT id, username, name FROM user WHERE UPPER(referral_code) = ?')
    .get(normalized) as { id: string; username: string | null; name: string } | null;

  if (!referrer) {
    return c.json({ error: 'Invite code not recognized.' }, 404);
  }

  ensurePlayerInitialized(userId, { pendingReferralCode: normalized });

  return c.json({
    applied: true,
    referrerName: referrer.username || referrer.name,
  });
});

playerRoutes.patch('/profile', zValidator('json', updateProfileSchema), (c) => {
  const userId = c.get('userId');
  const { name, username } = c.req.valid('json');

  if (username) {
    const conflict = sqlite
      .query('SELECT id FROM user WHERE LOWER(username) = LOWER(?) AND id != ?')
      .get(username, userId);
    if (conflict) {
      return c.json({ error: 'That pilot callsign is already taken.' }, 409);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  if (name && username) {
    sqlite
      .prepare('UPDATE user SET name = ?, username = ?, updated_at = ? WHERE id = ?')
      .run(name, username, now, userId);
  } else if (name) {
    sqlite
      .prepare('UPDATE user SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, now, userId);
  } else if (username) {
    sqlite
      .prepare('UPDATE user SET username = ?, updated_at = ? WHERE id = ?')
      .run(username, now, userId);
  }

  return c.json(getFullPlayerSnapshot(userId));
});

playerRoutes.get('/ledger', (c) => {
  const userId = c.get('userId');
  const entries = sqlite
    .query(
      `SELECT id, type, amount, balance_after as balanceAfter, description, created_at as createdAt
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    )
    .all(userId);

  return c.json({ entries });
});
