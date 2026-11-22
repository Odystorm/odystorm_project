import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import { ECONOMY_CONFIG, taskActionSchema } from '@odystorm/shared';
import { requireAuth, type AuthSessionVariables } from '../middleware/session';
import { sqlite } from '../db';
import { getFullPlayerSnapshot } from '../services/player';

export const taskRoutes = new Hono<{ Variables: AuthSessionVariables }>();

taskRoutes.use('*', requireAuth);

interface TaskRequirement {
  mineTotal?: number;
  url?: string;
  minWave?: number;
  minScore?: number;
}

taskRoutes.get('/', (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  const wallet = sqlite
    .query('SELECT balance, total_mined FROM wallets WHERE user_id = ?')
    .get(userId) as { balance: number; total_mined: number };

  const prog = sqlite
    .query('SELECT best_wave, best_score FROM player_progression WHERE user_id = ?')
    .get(userId) as { best_wave: number; best_score: number };

  const defs = sqlite
    .query(
      `SELECT id, title, description, reward_amount, task_type, icon, requirement_json, sort_order
       FROM task_definitions
       WHERE is_active = 1
       ORDER BY sort_order ASC, reward_amount ASC`
    )
    .all() as Array<{
    id: string;
    title: string;
    description: string;
    reward_amount: number;
    task_type: 'milestone' | 'social_following' | 'combat';
    icon: string;
    requirement_json: string;
    sort_order: number;
  }>;

  const userTaskRows = sqlite
    .query('SELECT task_id, status, clicked_at, claimed_at FROM user_tasks WHERE user_id = ?')
    .all(userId) as Array<{
    task_id: string;
    status: string;
    clicked_at: number | null;
    claimed_at: number | null;
  }>;

  const userTaskMap = new Map(userTaskRows.map((r) => [r.task_id, r]));

  const tasks = defs.map((def) => {
    const req = JSON.parse(def.requirement_json) as TaskRequirement;
    const ut = userTaskMap.get(def.id);

    if (ut?.status === 'claimed') {
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        rewardAmount: def.reward_amount,
        taskType: def.task_type,
        icon: def.icon,
        requirement: req,
        state: 'claimed' as const,
        progressCurrent: 1,
        progressTarget: 1,
        cooldownRemainingMs: 0,
      };
    }

    if (def.task_type === 'milestone') {
      const target = req.mineTotal ?? 0;
      const metric = Math.max(wallet.total_mined, wallet.balance);
      const isEligible = metric >= target;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        rewardAmount: def.reward_amount,
        taskType: def.task_type,
        icon: def.icon,
        requirement: req,
        state: isEligible ? ('claimable' as const) : ('locked' as const),
        progressCurrent: Math.min(metric, target),
        progressTarget: target,
        cooldownRemainingMs: 0,
      };
    }

    if (def.task_type === 'combat') {
      if (req.minWave) {
        const isEligible = prog.best_wave >= req.minWave;
        return {
          id: def.id,
          title: def.title,
          description: def.description,
          rewardAmount: def.reward_amount,
          taskType: def.task_type,
          icon: def.icon,
          requirement: req,
          state: isEligible ? ('claimable' as const) : ('locked' as const),
          progressCurrent: Math.min(prog.best_wave, req.minWave),
          progressTarget: req.minWave,
          cooldownRemainingMs: 0,
        };
      }
      const targetScore = req.minScore ?? 1000;
      const isEligible = prog.best_score >= targetScore;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        rewardAmount: def.reward_amount,
        taskType: def.task_type,
        icon: def.icon,
        requirement: req,
        state: isEligible ? ('claimable' as const) : ('locked' as const),
        progressCurrent: Math.min(prog.best_score, targetScore),
        progressTarget: targetScore,
        cooldownRemainingMs: 0,
      };
    }

    // social_following
    if (!ut?.clicked_at) {
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        rewardAmount: def.reward_amount,
        taskType: def.task_type,
        icon: def.icon,
        requirement: req,
        state: 'action_required' as const,
        progressCurrent: 0,
        progressTarget: 1,
        cooldownRemainingMs: 0,
      };
    }

    const elapsed = now - ut.clicked_at;
    const remaining = Math.max(0, ECONOMY_CONFIG.SOCIAL_TASK_VERIFY_COOLDOWN_MS - elapsed);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      rewardAmount: def.reward_amount,
      taskType: def.task_type,
      icon: def.icon,
      requirement: req,
      state: remaining > 0 ? ('verifying' as const) : ('claimable' as const),
      progressCurrent: remaining > 0 ? 0 : 1,
      progressTarget: 1,
      cooldownRemainingMs: remaining,
    };
  });

  return c.json({ tasks });
});

taskRoutes.post('/social-click', zValidator('json', taskActionSchema), (c) => {
  const userId = c.get('userId');
  const { taskId } = c.req.valid('json');
  const now = Date.now();

  const def = sqlite
    .query('SELECT id, task_type, requirement_json FROM task_definitions WHERE id = ? AND is_active = 1')
    .get(taskId) as { id: string; task_type: string; requirement_json: string } | null;

  if (!def || def.task_type !== 'social_following') {
    return c.json({ error: 'Social directive not found.' }, 404);
  }

  sqlite
    .prepare(
      `INSERT INTO user_tasks (id, user_id, task_id, status, clicked_at, claimed_at)
       VALUES (?, ?, ?, 'started', ?, NULL)
       ON CONFLICT(user_id, task_id) DO UPDATE SET
         clicked_at = COALESCE(user_tasks.clicked_at, excluded.clicked_at)`
    )
    .run(`ut_${nanoid(12)}`, userId, taskId, now);

  const req = JSON.parse(def.requirement_json) as TaskRequirement;
  return c.json({
    started: true,
    url: req.url || null,
    verifyCooldownMs: ECONOMY_CONFIG.SOCIAL_TASK_VERIFY_COOLDOWN_MS,
  });
});

taskRoutes.post('/claim', zValidator('json', taskActionSchema), (c) => {
  const userId = c.get('userId');
  const { taskId } = c.req.valid('json');
  const now = Date.now();

  try {
    const result = sqlite.transaction(() => {
      const def = sqlite
        .query(
          'SELECT id, title, reward_amount, task_type, requirement_json FROM task_definitions WHERE id = ? AND is_active = 1'
        )
        .get(taskId) as {
        id: string;
        title: string;
        reward_amount: number;
        task_type: 'milestone' | 'social_following' | 'combat';
        requirement_json: string;
      } | null;

      if (!def) throw new Error('TASK_NOT_FOUND');

      const existing = sqlite
        .query('SELECT status, clicked_at FROM user_tasks WHERE user_id = ? AND task_id = ?')
        .get(userId, taskId) as { status: string; clicked_at: number | null } | null;

      if (existing?.status === 'claimed') {
        throw new Error('ALREADY_CLAIMED');
      }

      const req = JSON.parse(def.requirement_json) as TaskRequirement;
      const wallet = sqlite
        .query('SELECT balance, total_mined, total_earned FROM wallets WHERE user_id = ?')
        .get(userId) as { balance: number; total_mined: number; total_earned: number };
      const prog = sqlite
        .query('SELECT best_wave, best_score FROM player_progression WHERE user_id = ?')
        .get(userId) as { best_wave: number; best_score: number };

      if (def.task_type === 'milestone') {
        const metric = Math.max(wallet.total_mined, wallet.balance);
        if (metric < (req.mineTotal ?? 0)) {
          throw new Error('REQUIREMENT_NOT_MET');
        }
      } else if (def.task_type === 'combat') {
        if (req.minWave && prog.best_wave < req.minWave) {
          throw new Error('REQUIREMENT_NOT_MET');
        }
        if (req.minScore && prog.best_score < req.minScore) {
          throw new Error('REQUIREMENT_NOT_MET');
        }
      } else if (def.task_type === 'social_following') {
        if (!existing?.clicked_at) {
          throw new Error('REQUIREMENT_NOT_MET');
        }
        if (now - existing.clicked_at < ECONOMY_CONFIG.SOCIAL_TASK_VERIFY_COOLDOWN_MS) {
          throw new Error('COOLDOWN_ACTIVE');
        }
      }

      sqlite
        .prepare(
          `INSERT INTO user_tasks (id, user_id, task_id, status, clicked_at, claimed_at)
           VALUES (?, ?, ?, 'claimed', ?, ?)
           ON CONFLICT(user_id, task_id) DO UPDATE SET status = 'claimed', claimed_at = excluded.claimed_at`
        )
        .run(`ut_${nanoid(12)}`, userId, taskId, existing?.clicked_at ?? now, now);

      const nextBalance = wallet.balance + def.reward_amount;
      sqlite
        .prepare('UPDATE wallets SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?')
        .run(nextBalance, wallet.total_earned + def.reward_amount, now, userId);

      sqlite
        .prepare(
          `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
           VALUES (?, ?, 'task_reward', ?, ?, ?, ?, ?)`
        )
        .run(
          `tx_${nanoid(12)}`,
          userId,
          def.reward_amount,
          nextBalance,
          `Mission Completed: ${def.title}`,
          def.id,
          now
        );

      return { rewardAmount: def.reward_amount, title: def.title };
    })();

    return c.json({
      ...result,
      snapshot: getFullPlayerSnapshot(userId),
    });
  } catch (err: unknown) {
    const code = (err as Error).message;
    if (code === 'TASK_NOT_FOUND') return c.json({ error: 'Mission not found.' }, 404);
    if (code === 'ALREADY_CLAIMED') return c.json({ error: 'Mission reward already claimed.' }, 409);
    if (code === 'COOLDOWN_ACTIVE') {
      return c.json({ error: 'Verification still in progress. Please wait a few seconds.' }, 400);
    }
    if (code === 'REQUIREMENT_NOT_MET') {
      return c.json({ error: 'Mission requirements not yet met.' }, 400);
    }
    throw err;
  }
});
