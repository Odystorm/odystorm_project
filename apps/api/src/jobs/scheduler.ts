import { SPACE_DEFENSE_CONFIG } from '@odystorm/shared';
import { sqlite } from '../db';
import { createNotification } from '../services/push';

export function runMaintenanceSweep(now: number = Date.now()): {
  tenMinAlerts: number;
  twelveHourAlerts: number;
  expiredRuns: number;
} {
  let tenMinAlerts = 0;
  let twelveHourAlerts = 0;

  // 10-minute post-completion mining reminders
  const tenMinDue = sqlite
    .query(
      `SELECT id, user_id, reward_amount, end_time
       FROM mining_sessions
       WHERE status = 'farming'
         AND ten_min_reminded = 0
         AND ? >= end_time + (10 * 60 * 1000)`
    )
    .all(now) as Array<{ id: string; user_id: string; reward_amount: number; end_time: number }>;

  for (const session of tenMinDue) {
    sqlite
      .prepare('UPDATE mining_sessions SET ten_min_reminded = 1 WHERE id = ?')
      .run(session.id);

    createNotification(
      session.user_id,
      'mining_complete',
      'Mining Extraction Complete',
      `Your orbital reactor has finished extracting ${session.reward_amount.toLocaleString()} $ODY. Claim your yield and ignite the next cycle.`,
      { sendPush: true, url: '/' }
    );
    tenMinAlerts += 1;
  }

  // 12-hour unclaimed mining reminders
  const twelveHourDue = sqlite
    .query(
      `SELECT id, user_id, reward_amount
       FROM mining_sessions
       WHERE status = 'farming'
         AND twelve_hour_reminded = 0
         AND ? >= end_time + (12 * 3600 * 1000)`
    )
    .all(now) as Array<{ id: string; user_id: string; reward_amount: number }>;

  for (const session of twelveHourDue) {
    sqlite
      .prepare('UPDATE mining_sessions SET twelve_hour_reminded = 1 WHERE id = ?')
      .run(session.id);

    createNotification(
      session.user_id,
      'mining_complete',
      'Unclaimed $ODY Waiting in Bay',
      `${session.reward_amount.toLocaleString()} $ODY is ready for pickup in your Command Deck.`,
      { sendPush: true, url: '/' }
    );
    twelveHourAlerts += 1;
  }

  // Expire abandoned Space Defense active sessions older than MAX_RUN_DURATION_MS
  const expireCutoff = now - SPACE_DEFENSE_CONFIG.MAX_RUN_DURATION_MS;
  const expiredInfo = sqlite
    .prepare(
      "UPDATE game_runs SET status = 'expired', ended_at = ? WHERE status = 'active' AND started_at < ?"
    )
    .run(now, expireCutoff);

  return {
    tenMinAlerts,
    twelveHourAlerts,
    expiredRuns: expiredInfo.changes,
  };
}

let schedulerTimer: Timer | null = null;

export function startScheduler(intervalMs: number = 60_000): void {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    try {
      runMaintenanceSweep();
    } catch (err) {
      console.error('[OdyStorm Scheduler] Sweep failed:', err);
    }
  }, intervalMs);
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
