import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import {
  adminBroadcastSchema,
  adminCreateTaskSchema,
  adminUpdateTaskSchema,
  adminUpdateUserSchema,
  getOfficerRank,
} from '@odystorm/shared';
import { requireAdmin, type AuthSessionVariables } from '../middleware/session';
import { sqlite } from '../db';
import { toUtcDateString } from '../services/player';
import { broadcastAnnouncementRealtime, broadcastWebPush } from '../services/push';

export const adminRoutes = new Hono<{ Variables: AuthSessionVariables }>();

adminRoutes.use('*', requireAdmin);

adminRoutes.get('/metrics', (c) => {
  const todayUtc = toUtcDateString();

  const userStats = sqlite
    .query(
      `SELECT
         COUNT(*) as totalUsers,
         SUM(CASE WHEN COALESCE(is_anonymous, 0) = 0 THEN 1 ELSE 0 END) as registeredUsers,
         SUM(CASE WHEN COALESCE(is_anonymous, 0) = 1 THEN 1 ELSE 0 END) as guestUsers
       FROM user`
    )
    .get() as { totalUsers: number; registeredUsers: number; guestUsers: number };

  const activeToday = sqlite
    .query('SELECT COUNT(*) as count FROM player_progression WHERE last_checkin_date = ?')
    .get(todayUtc) as { count: number };

  const walletStats = sqlite
    .query(
      `SELECT
         COALESCE(SUM(balance), 0) as circulatingSupply,
         COALESCE(SUM(total_mined), 0) as totalMined,
         COALESCE(SUM(tickets), 0) as totalTicketsHeld
       FROM wallets`
    )
    .get() as { circulatingSupply: number; totalMined: number; totalTicketsHeld: number };

  const miningStats = sqlite
    .query(
      `SELECT
         COUNT(*) as totalSessions,
         SUM(CASE WHEN status = 'farming' THEN 1 ELSE 0 END) as activeSessions
       FROM mining_sessions`
    )
    .get() as { totalSessions: number; activeSessions: number };

  const gameStats = sqlite
    .query(
      `SELECT
         COUNT(*) as completedRuns,
         COALESCE(SUM(ody_rewarded), 0) as combatOdyAwarded,
         COALESCE(MAX(score), 0) as highestScore
       FROM game_runs
       WHERE status = 'completed'`
    )
    .get() as { completedRuns: number; combatOdyAwarded: number; highestScore: number };

  const pushSubs = sqlite
    .query('SELECT COUNT(*) as count FROM push_subscriptions')
    .get() as { count: number };

  const announcements = sqlite
    .query(
      `SELECT id, title, body, media_url as mediaUrl, media_type as mediaType, created_at as createdAt
       FROM announcements
       ORDER BY created_at DESC
       LIMIT 10`
    )
    .all();

  return c.json({
    users: {
      total: userStats.totalUsers || 0,
      registered: userStats.registeredUsers || 0,
      guests: userStats.guestUsers || 0,
      activeToday: activeToday.count || 0,
      pushSubscribers: pushSubs.count || 0,
    },
    economy: {
      circulatingSupply: walletStats.circulatingSupply || 0,
      totalMined: walletStats.totalMined || 0,
      totalTicketsHeld: walletStats.totalTicketsHeld || 0,
      combatOdyAwarded: gameStats.combatOdyAwarded || 0,
    },
    activity: {
      totalMiningSessions: miningStats.totalSessions || 0,
      activeMiningSessions: miningStats.activeSessions || 0,
      completedSpaceDefenseRuns: gameStats.completedRuns || 0,
      highestSpaceDefenseScore: gameStats.highestScore || 0,
    },
    recentAnnouncements: announcements,
  });
});

adminRoutes.post('/broadcast', zValidator('json', adminBroadcastSchema), async (c) => {
  const adminUserId = c.get('userId');
  const { title, body, mediaUrl, mediaType, sendWebPush } = c.req.valid('json');
  const now = Date.now();
  const id = `ann_${nanoid(12)}`;
  const cleanMedia = mediaUrl?.trim() ? mediaUrl.trim() : null;
  const resolvedMediaType = cleanMedia ? mediaType : 'none';

  sqlite
    .prepare(
      `INSERT INTO announcements (id, author_user_id, title, body, media_url, media_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, adminUserId, title, body, cleanMedia, resolvedMediaType, now);

  const announcement = {
    id,
    title,
    body,
    mediaUrl: cleanMedia,
    mediaType: resolvedMediaType,
    createdAt: now,
  };

  broadcastAnnouncementRealtime(announcement);

  let pushDelivered = 0;
  if (sendWebPush) {
    pushDelivered = await broadcastWebPush({
      title,
      body: body.slice(0, 140),
      url: '/inbox',
    });
  }

  return c.json({
    announcement,
    pushDelivered,
  });
});

adminRoutes.get('/tasks', (c) => {
  const rows = sqlite
    .query(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.reward_amount as rewardAmount,
         t.task_type as taskType,
         t.icon,
         t.requirement_json as requirementJson,
         t.is_active as isActive,
         t.sort_order as sortOrder,
         t.created_at as createdAt,
         (SELECT COUNT(*) FROM user_tasks ut WHERE ut.task_id = t.id AND ut.status = 'claimed') as claimCount
       FROM task_definitions t
       ORDER BY t.sort_order ASC, t.created_at DESC`
    )
    .all() as Array<{
    id: string;
    title: string;
    description: string;
    rewardAmount: number;
    taskType: string;
    icon: string;
    requirementJson: string;
    isActive: number;
    sortOrder: number;
    createdAt: number;
    claimCount: number;
  }>;

  return c.json({
    tasks: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      rewardAmount: r.rewardAmount,
      taskType: r.taskType,
      icon: r.icon,
      requirement: JSON.parse(r.requirementJson),
      isActive: Boolean(r.isActive),
      sortOrder: r.sortOrder,
      createdAt: r.createdAt,
      claimCount: r.claimCount,
    })),
  });
});

adminRoutes.post('/tasks', zValidator('json', adminCreateTaskSchema), (c) => {
  const input = c.req.valid('json');
  const id = `task_${nanoid(10)}`;
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO task_definitions
         (id, title, description, reward_amount, task_type, icon, requirement_json, is_active, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 50, ?)`
    )
    .run(
      id,
      input.title,
      input.description || '',
      input.rewardAmount,
      input.taskType,
      input.icon,
      JSON.stringify(input.requirement),
      input.isActive ? 1 : 0,
      now
    );

  return c.json({ id, created: true }, 201);
});

adminRoutes.patch('/tasks/:id', zValidator('json', adminUpdateTaskSchema), (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');

  const existing = sqlite
    .query('SELECT * FROM task_definitions WHERE id = ?')
    .get(id) as {
    id: string;
    title: string;
    description: string;
    reward_amount: number;
    task_type: string;
    icon: string;
    requirement_json: string;
    is_active: number;
  } | null;

  if (!existing) {
    return c.json({ error: 'Task definition not found.' }, 404);
  }

  sqlite
    .prepare(
      `UPDATE task_definitions
       SET title = ?,
           description = ?,
           reward_amount = ?,
           task_type = ?,
           icon = ?,
           requirement_json = ?,
           is_active = ?
       WHERE id = ?`
    )
    .run(
      input.title ?? existing.title,
      input.description ?? existing.description,
      input.rewardAmount ?? existing.reward_amount,
      input.taskType ?? existing.task_type,
      input.icon ?? existing.icon,
      input.requirement ? JSON.stringify(input.requirement) : existing.requirement_json,
      input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.is_active,
      id
    );

  return c.json({ id, updated: true });
});

adminRoutes.delete('/tasks/:id', (c) => {
  const id = c.req.param('id');
  sqlite.prepare('DELETE FROM task_definitions WHERE id = ?').run(id);
  return c.json({ deleted: true });
});

adminRoutes.get('/users', (c) => {
  const q = (c.req.query('q') || '').trim();
  const pattern = `%${q}%`;

  const users = sqlite
    .query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.username,
         u.is_anonymous as isAnonymous,
         u.role,
         u.referral_code as referralCode,
         u.created_at as createdAt,
         COALESCE(w.balance, 0) as balance,
         COALESCE(w.tickets, 0) as tickets,
         COALESCE(w.total_mined, 0) as totalMined,
         COALESCE(p.ship_level, 1) as shipLevel,
         COALESCE(p.best_score, 0) as bestScore
       FROM user u
       LEFT JOIN wallets w ON w.user_id = u.id
       LEFT JOIN player_progression p ON p.user_id = u.id
       WHERE (? = '' OR u.email LIKE ? OR u.username LIKE ? OR u.name LIKE ? OR u.referral_code LIKE ?)
       ORDER BY u.created_at DESC
       LIMIT 60`
    )
    .all(q, pattern, pattern, pattern, pattern) as Array<{
    id: string;
    name: string;
    email: string;
    username: string | null;
    isAnonymous: number | null;
    role: string;
    referralCode: string | null;
    createdAt: number;
    balance: number;
    tickets: number;
    totalMined: number;
    shipLevel: number;
    bestScore: number;
  }>;

  return c.json({
    users: users.map((u) => ({
      ...u,
      isAnonymous: Boolean(u.isAnonymous),
      officerRank: getOfficerRank(u.shipLevel),
    })),
  });
});

adminRoutes.patch('/users/:id', zValidator('json', adminUpdateUserSchema), (c) => {
  const targetUserId = c.req.param('id');
  const { role, balanceDelta, ticketsDelta } = c.req.valid('json');
  const now = Date.now();

  const targetExists = sqlite
    .query('SELECT id FROM user WHERE id = ?')
    .get(targetUserId);

  if (!targetExists) {
    return c.json({ error: 'Player not found.' }, 404);
  }

  sqlite.transaction(() => {
    if (role) {
      sqlite.prepare('UPDATE user SET role = ? WHERE id = ?').run(role, targetUserId);
    }

    if (balanceDelta || ticketsDelta) {
      const wallet = sqlite
        .query('SELECT balance, tickets, total_earned FROM wallets WHERE user_id = ?')
        .get(targetUserId) as { balance: number; tickets: number; total_earned: number } | null;

      if (wallet) {
        const nextBalance = Math.max(0, wallet.balance + (balanceDelta || 0));
        const nextTickets = Math.max(0, wallet.tickets + (ticketsDelta || 0));
        const nextEarned =
          balanceDelta && balanceDelta > 0
            ? wallet.total_earned + balanceDelta
            : wallet.total_earned;

        sqlite
          .prepare(
            'UPDATE wallets SET balance = ?, tickets = ?, total_earned = ?, updated_at = ? WHERE user_id = ?'
          )
          .run(nextBalance, nextTickets, nextEarned, now, targetUserId);

        if (balanceDelta && balanceDelta !== 0) {
          sqlite
            .prepare(
              `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
               VALUES (?, ?, 'admin_adjustment', ?, ?, 'Fleet Command Treasury Adjustment', ?, ?)`
            )
            .run(
              `tx_${nanoid(12)}`,
              targetUserId,
              balanceDelta,
              nextBalance,
              c.get('userId'),
              now
            );
        }
      }
    }
  })();

  return c.json({ updated: true });
});
