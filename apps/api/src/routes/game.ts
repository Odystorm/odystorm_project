import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import {
  finishGameRunSchema,
  getOfficerRank,
  getShipCombatStats,
  startGameRunSchema,
  validateAndScoreRun,
} from '@odystorm/shared';
import { requireAuth, type AuthSessionVariables } from '../middleware/session';
import { sqlite } from '../db';
import { getFullPlayerSnapshot } from '../services/player';

export const gameRoutes = new Hono<{ Variables: AuthSessionVariables }>();

gameRoutes.get('/leaderboard', (c) => {
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;

  const allTime = sqlite
    .query(
      `SELECT
         u.id as userId,
         COALESCE(u.username, u.name) as callsign,
         p.ship_level as shipLevel,
         p.best_score as bestScore,
         p.best_wave as bestWave
       FROM player_progression p
       JOIN user u ON u.id = p.user_id
       WHERE p.best_score > 0
       ORDER BY p.best_score DESC, p.best_wave DESC
       LIMIT 25`
    )
    .all() as Array<{
    userId: string;
    callsign: string;
    shipLevel: number;
    bestScore: number;
    bestWave: number;
  }>;

  const weekly = sqlite
    .query(
      `SELECT
         u.id as userId,
         COALESCE(u.username, u.name) as callsign,
         p.ship_level as shipLevel,
         MAX(r.score) as bestScore,
         MAX(r.wave_reached) as bestWave
       FROM game_runs r
       JOIN user u ON u.id = r.user_id
       JOIN player_progression p ON p.user_id = r.user_id
       WHERE r.status = 'completed' AND r.is_practice = 0 AND r.ended_at >= ? AND r.score > 0
       GROUP BY r.user_id
       ORDER BY bestScore DESC, bestWave DESC
       LIMIT 25`
    )
    .all(sevenDaysAgo) as Array<{
    userId: string;
    callsign: string;
    shipLevel: number;
    bestScore: number;
    bestWave: number;
  }>;

  return c.json({
    allTime: allTime.map((row, idx) => ({
      rank: idx + 1,
      ...row,
      officerRank: getOfficerRank(row.shipLevel),
    })),
    weekly: weekly.map((row, idx) => ({
      rank: idx + 1,
      ...row,
      officerRank: getOfficerRank(row.shipLevel),
    })),
  });
});

gameRoutes.use('*', requireAuth);

gameRoutes.get('/history', (c) => {
  const userId = c.get('userId');
  const runs = sqlite
    .query(
      `SELECT
         id,
         is_practice as isPractice,
         wave_reached as waveReached,
         enemies_destroyed as enemiesDestroyed,
         shards_collected as shardsCollected,
         score,
         ody_rewarded as odyRewarded,
         started_at as startedAt,
         ended_at as endedAt
       FROM game_runs
       WHERE user_id = ? AND status = 'completed'
       ORDER BY ended_at DESC
       LIMIT 15`
    )
    .all(userId);

  return c.json({ runs });
});

gameRoutes.post('/start', zValidator('json', startGameRunSchema), (c) => {
  const userId = c.get('userId');
  const { practice } = c.req.valid('json');
  const now = Date.now();

  try {
    const started = sqlite.transaction(() => {
      const wallet = sqlite
        .query('SELECT tickets FROM wallets WHERE user_id = ?')
        .get(userId) as { tickets: number };
      const prog = sqlite
        .query('SELECT ship_level, energy_hours FROM player_progression WHERE user_id = ?')
        .get(userId) as { ship_level: number; energy_hours: number };

      if (!practice && wallet.tickets < 1) {
        throw new Error('NO_TICKETS');
      }

      const nextTickets = practice ? wallet.tickets : wallet.tickets - 1;
      if (!practice) {
        sqlite
          .prepare('UPDATE wallets SET tickets = ?, updated_at = ? WHERE user_id = ?')
          .run(nextTickets, now, userId);
      }

      // Mark any prior unfinished active runs for this user as expired
      sqlite
        .prepare(
          "UPDATE game_runs SET status = 'expired', ended_at = ? WHERE user_id = ? AND status = 'active'"
        )
        .run(now, userId);

      const runId = `run_${nanoid(14)}`;
      const seed = nanoid(12);

      sqlite
        .prepare(
          `INSERT INTO game_runs
             (id, user_id, seed, is_practice, ship_level_snapshot, energy_hours_snapshot, started_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
        )
        .run(
          runId,
          userId,
          seed,
          practice ? 1 : 0,
          prog.ship_level,
          prog.energy_hours,
          now
        );

      return {
        runId,
        seed,
        isPractice: Boolean(practice),
        remainingTickets: nextTickets,
        combatStats: getShipCombatStats(prog.ship_level, prog.energy_hours),
      };
    })();

    return c.json(started);
  } catch (err: unknown) {
    if ((err as Error).message === 'NO_TICKETS') {
      return c.json(
        { error: 'Out of Sortie Tickets! Launch Practice Mode or return tomorrow for daily refill.' },
        400
      );
    }
    throw err;
  }
});

gameRoutes.post('/finish', zValidator('json', finishGameRunSchema), (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const now = Date.now();

  try {
    const summary = sqlite.transaction(() => {
      const run = sqlite
        .query(
          `SELECT id, user_id, is_practice, ship_level_snapshot, energy_hours_snapshot, started_at, status
           FROM game_runs WHERE id = ?`
        )
        .get(body.runId) as {
        id: string;
        user_id: string;
        is_practice: number;
        ship_level_snapshot: number;
        energy_hours_snapshot: number;
        started_at: number;
        status: string;
      } | null;

      if (!run || run.user_id !== userId) {
        throw new Error('RUN_NOT_FOUND');
      }
      if (run.status !== 'active') {
        throw new Error('RUN_ALREADY_CLOSED');
      }

      const elapsedMs = Math.max(0, now - run.started_at);
      const isPractice = Boolean(run.is_practice);

      const validated = validateAndScoreRun({
        elapsedMs,
        waveReached: body.waveReached,
        asteroidsDestroyed: body.asteroidsDestroyed,
        scoutsDestroyed: body.scoutsDestroyed,
        cruisersDestroyed: body.cruisersDestroyed,
        bossesDestroyed: body.bossesDestroyed,
        shardsCollected: body.shardsCollected,
        shipLevel: run.ship_level_snapshot,
        energyHours: run.energy_hours_snapshot,
        isPractice,
      });

      if (!validated.valid) {
        sqlite
          .prepare("UPDATE game_runs SET status = 'expired', ended_at = ? WHERE id = ?")
          .run(now, run.id);
        throw new Error('RUN_TOO_SHORT');
      }

      sqlite
        .prepare(
          `UPDATE game_runs
           SET status = 'completed',
               ended_at = ?,
               wave_reached = ?,
               enemies_destroyed = ?,
               shards_collected = ?,
               score = ?,
               ody_rewarded = ?
           WHERE id = ?`
        )
        .run(
          now,
          validated.sanitizedWave,
          validated.enemiesDestroyed,
          body.shardsCollected,
          validated.score,
          validated.odyReward,
          run.id
        );

      const prog = sqlite
        .query('SELECT best_score, best_wave FROM player_progression WHERE user_id = ?')
        .get(userId) as { best_score: number; best_wave: number };

      const isNewHighScore = !isPractice && validated.score > prog.best_score;

      if (!isPractice) {
        sqlite
          .prepare(
            `UPDATE player_progression
             SET best_score = ?, best_wave = ?, updated_at = ?
             WHERE user_id = ?`
          )
          .run(
            Math.max(prog.best_score, validated.score),
            Math.max(prog.best_wave, validated.sanitizedWave),
            now,
            userId
          );
      }

      if (!isPractice && validated.odyReward > 0) {
        const wallet = sqlite
          .query('SELECT balance, total_mined, total_earned FROM wallets WHERE user_id = ?')
          .get(userId) as { balance: number; total_mined: number; total_earned: number };

        const nextBalance = wallet.balance + validated.odyReward;
        sqlite
          .prepare(
            `UPDATE wallets
             SET balance = ?, total_mined = ?, total_earned = ?, updated_at = ?
             WHERE user_id = ?`
          )
          .run(
            nextBalance,
            wallet.total_mined + validated.odyReward,
            wallet.total_earned + validated.odyReward,
            now,
            userId
          );

        sqlite
          .prepare(
            `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
             VALUES (?, ?, 'space_defense_reward', ?, ?, ?, ?, ?)`
          )
          .run(
            `tx_${nanoid(12)}`,
            userId,
            validated.odyReward,
            nextBalance,
            `Space Defense Sortie (Wave ${validated.sanitizedWave} · ${validated.score.toLocaleString()} pts)`,
            run.id,
            now
          );
      }

      return {
        runId: run.id,
        isPractice,
        waveReached: validated.sanitizedWave,
        enemiesDestroyed: validated.enemiesDestroyed,
        score: validated.score,
        odyRewarded: validated.odyReward,
        isNewHighScore,
      };
    })();

    return c.json({
      ...summary,
      snapshot: getFullPlayerSnapshot(userId),
    });
  } catch (err: unknown) {
    const code = (err as Error).message;
    if (code === 'RUN_NOT_FOUND') {
      return c.json({ error: 'Game session not found.' }, 404);
    }
    if (code === 'RUN_ALREADY_CLOSED') {
      return c.json({ error: 'This sortie has already been recorded.' }, 409);
    }
    if (code === 'RUN_TOO_SHORT') {
      return c.json({ error: 'Sortie ended too quickly to score.' }, 400);
    }
    throw err;
  }
});
