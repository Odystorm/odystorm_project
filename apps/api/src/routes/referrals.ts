import { Hono } from 'hono';
import { ECONOMY_CONFIG, getOfficerRank } from '@odystorm/shared';
import { requireAuth, type AuthSessionVariables } from '../middleware/session';
import { sqlite } from '../db';

export const referralRoutes = new Hono<{ Variables: AuthSessionVariables }>();

// Public invite code preview for /invite/[code]
referralRoutes.get('/resolve/:code', (c) => {
  const code = c.req.param('code').trim().toUpperCase();
  const inviter = sqlite
    .query(
      `SELECT u.username, u.name, u.referral_code as referralCode, COALESCE(p.ship_level, 1) as shipLevel
       FROM user u
       LEFT JOIN player_progression p ON p.user_id = u.id
       WHERE UPPER(u.referral_code) = ?`
    )
    .get(code) as {
    username: string | null;
    name: string;
    referralCode: string;
    shipLevel: number;
  } | null;

  if (!inviter) {
    return c.json({ valid: false }, 404);
  }

  return c.json({
    valid: true,
    referralCode: inviter.referralCode,
    commanderName: inviter.username || inviter.name,
    officerRank: getOfficerRank(inviter.shipLevel),
    signupBonus: ECONOMY_CONFIG.REFERRAL_SIGNUP_BONUS,
    commissionPercent: ECONOMY_CONFIG.REFERRAL_MINING_SHARE_RATE * 100,
  });
});

referralRoutes.use('*', requireAuth);

referralRoutes.get('/', (c) => {
  const userId = c.get('userId');

  const me = sqlite
    .query('SELECT referral_code as referralCode, referred_by_user_id as referredByUserId FROM user WHERE id = ?')
    .get(userId) as { referralCode: string; referredByUserId: string | null };

  const squadRows = sqlite
    .query(
      `SELECT
         r.id,
         r.referred_user_id as userId,
         COALESCE(u.username, u.name) as callsign,
         u.is_anonymous as isAnonymous,
         COALESCE(w.balance, 0) as balance,
         COALESCE(w.total_mined, 0) as totalMined,
         COALESCE(p.ship_level, 1) as shipLevel,
         r.signup_bonus_awarded as signupBonusAwarded,
         r.total_commission_earned as totalCommissionEarned,
         r.created_at as joinedAt
       FROM referrals r
       JOIN user u ON u.id = r.referred_user_id
       LEFT JOIN wallets w ON w.user_id = u.id
       LEFT JOIN player_progression p ON p.user_id = u.id
       WHERE r.referrer_user_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(userId) as Array<{
    id: string;
    userId: string;
    callsign: string;
    isAnonymous: number | null;
    balance: number;
    totalMined: number;
    shipLevel: number;
    signupBonusAwarded: number;
    totalCommissionEarned: number;
    joinedAt: number;
  }>;

  const totalBonusEarned = squadRows.reduce(
    (sum, r) => sum + r.signupBonusAwarded + r.totalCommissionEarned,
    0
  );

  let myCommander: string | null = null;
  if (me.referredByUserId) {
    const cmd = sqlite
      .query('SELECT COALESCE(username, name) as callsign FROM user WHERE id = ?')
      .get(me.referredByUserId) as { callsign: string } | null;
    myCommander = cmd?.callsign ?? null;
  }

  return c.json({
    referralCode: me.referralCode,
    referredByCommander: myCommander,
    totalSquadMembers: squadRows.length,
    totalBonusEarned,
    squad: squadRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      callsign: row.callsign,
      isAnonymous: Boolean(row.isAnonymous),
      balance: row.balance,
      totalMined: row.totalMined,
      shipLevel: row.shipLevel,
      officerRank: getOfficerRank(row.shipLevel),
      signupBonusAwarded: row.signupBonusAwarded,
      totalCommissionEarned: row.totalCommissionEarned,
      joinedAt: row.joinedAt,
    })),
  });
});
