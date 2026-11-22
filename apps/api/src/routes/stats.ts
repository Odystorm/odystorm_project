import { Hono } from 'hono';
import { getOfficerRank } from '@odystorm/shared';
import { sqlite } from '../db';
import { toUtcDateString } from '../services/player';

export const statsRoutes = new Hono();

statsRoutes.get('/', (c) => {
  const todayUtc = toUtcDateString();

  const totals = sqlite
    .query(
      `SELECT
         COALESCE(SUM(total_mined), 0) as totalMined,
         COALESCE(SUM(balance), 0) as circulatingSupply
       FROM wallets`
    )
    .get() as { totalMined: number; circulatingSupply: number };

  const mineSessionsRow = sqlite
    .query('SELECT COUNT(*) as count FROM mining_sessions')
    .get() as { count: number };

  const sortiesRow = sqlite
    .query("SELECT COUNT(*) as count FROM game_runs WHERE status = 'completed'")
    .get() as { count: number };

  const armyTotalRow = sqlite
    .query('SELECT COUNT(*) as count FROM user')
    .get() as { count: number };

  const reportedTodayRow = sqlite
    .query('SELECT COUNT(*) as count FROM player_progression WHERE last_checkin_date = ?')
    .get(todayUtc) as { count: number };

  const topMiners = sqlite
    .query(
      `SELECT
         u.id as userId,
         COALESCE(u.username, u.name) as callsign,
         w.total_mined as totalMined,
         w.balance as balance,
         COALESCE(p.ship_level, 1) as shipLevel
       FROM wallets w
       JOIN user u ON u.id = w.user_id
       LEFT JOIN player_progression p ON p.user_id = u.id
       ORDER BY w.total_mined DESC, w.balance DESC
       LIMIT 20`
    )
    .all() as Array<{
    userId: string;
    callsign: string;
    totalMined: number;
    balance: number;
    shipLevel: number;
  }>;

  return c.json({
    totalMined: totals.totalMined,
    circulatingSupply: totals.circulatingSupply,
    noOfMineSessions: mineSessionsRow.count,
    totalSorties: sortiesRow.count,
    armyTotal: armyTotalRow.count,
    reportedToday: reportedTodayRow.count,
    topMiners: topMiners.map((m, idx) => ({
      rank: idx + 1,
      ...m,
      officerRank: getOfficerRank(m.shipLevel),
    })),
  });
});
