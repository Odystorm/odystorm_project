import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import {
  ECONOMY_CONFIG,
  calculateMiningReward,
  getNextShipUpgrade,
  getNextEnergyUpgrade,
  upgradePurchaseSchema,
} from '@odystorm/shared';
import { requireAuth, type AuthSessionVariables } from '../middleware/session';
import { sqlite } from '../db';
import {
  awardPendingReferralSignupBonus,
  getFullPlayerSnapshot,
} from '../services/player';
import { createNotification } from '../services/push';
import { emitToUser } from '../ws/hub';

export const miningRoutes = new Hono<{ Variables: AuthSessionVariables }>();

miningRoutes.use('*', requireAuth);

miningRoutes.post('/start', (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  const existing = sqlite
    .query("SELECT id FROM mining_sessions WHERE user_id = ? AND status = 'farming' LIMIT 1")
    .get(userId);

  if (existing) {
    return c.json({ error: 'A mining reactor cycle is already active.' }, 409);
  }

  const prog = sqlite
    .query('SELECT ship_level, energy_hours FROM player_progression WHERE user_id = ?')
    .get(userId) as { ship_level: number; energy_hours: number } | null;

  if (!prog) {
    return c.json({ error: 'Player progression not initialized.' }, 400);
  }

  const durationMs = Math.floor(prog.energy_hours * 3_600_000);
  const endTime = now + durationMs;
  const rewardAmount = calculateMiningReward(prog.energy_hours, prog.ship_level);
  const sessionId = `mine_${nanoid(12)}`;

  sqlite
    .prepare(
      `INSERT INTO mining_sessions
         (id, user_id, start_time, end_time, duration_hours, rate_per_sec, reward_amount, status, ten_min_reminded, twelve_hour_reminded, claimed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'farming', 0, 0, NULL)`
    )
    .run(sessionId, userId, now, endTime, prog.energy_hours, prog.ship_level, rewardAmount);

  return c.json(getFullPlayerSnapshot(userId));
});

miningRoutes.post('/claim', (c) => {
  const userId = c.get('userId');
  const now = Date.now();

  let referrerCommissionAlert: {
    referrerId: string;
    share: number;
    minerName: string;
  } | null = null;

  try {
    const claimResult = sqlite.transaction(() => {
      const session = sqlite
        .query(
          `SELECT id, start_time, end_time, reward_amount, status
           FROM mining_sessions
           WHERE user_id = ? AND status = 'farming'
           ORDER BY start_time DESC LIMIT 1`
        )
        .get(userId) as {
        id: string;
        start_time: number;
        end_time: number;
        reward_amount: number;
        status: string;
      } | null;

      if (!session) {
        throw new Error('NO_ACTIVE_SESSION');
      }

      if (now < session.end_time) {
        throw new Error('SESSION_NOT_COMPLETE');
      }

      const wallet = sqlite
        .query('SELECT balance, total_mined, total_earned FROM wallets WHERE user_id = ?')
        .get(userId) as { balance: number; total_mined: number; total_earned: number };

      const minerUser = sqlite
        .query('SELECT username, name, referred_by_user_id FROM user WHERE id = ?')
        .get(userId) as {
        username: string | null;
        name: string;
        referred_by_user_id: string | null;
      };

      const reward = session.reward_amount;
      const nextBalance = wallet.balance + reward;

      sqlite
        .prepare("UPDATE mining_sessions SET status = 'claimed', claimed_at = ? WHERE id = ?")
        .run(now, session.id);

      sqlite
        .prepare(
          `UPDATE wallets
           SET balance = ?, total_mined = ?, total_earned = ?, updated_at = ?
           WHERE user_id = ?`
        )
        .run(
          nextBalance,
          wallet.total_mined + reward,
          wallet.total_earned + reward,
          now,
          userId
        );

      sqlite
        .prepare(
          `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
           VALUES (?, ?, 'mining_claim', ?, ?, 'Completed Orbital Mining Extraction', ?, ?)`
        )
        .run(`tx_${nanoid(12)}`, userId, reward, nextBalance, session.id, now);

      // Atomic 10% referral commission payout (fixes legacy claim-tokens.js bug)
      if (minerUser?.referred_by_user_id) {
        const share = Math.floor(reward * ECONOMY_CONFIG.REFERRAL_MINING_SHARE_RATE);
        if (share > 0) {
          const refWallet = sqlite
            .query('SELECT balance, total_earned FROM wallets WHERE user_id = ?')
            .get(minerUser.referred_by_user_id) as {
            balance: number;
            total_earned: number;
          } | null;

          if (refWallet) {
            const refNextBalance = refWallet.balance + share;
            sqlite
              .prepare(
                'UPDATE wallets SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?'
              )
              .run(
                refNextBalance,
                refWallet.total_earned + share,
                now,
                minerUser.referred_by_user_id
              );

            sqlite
              .prepare(
                `UPDATE referrals
                 SET total_commission_earned = total_commission_earned + ?
                 WHERE referrer_user_id = ? AND referred_user_id = ?`
              )
              .run(share, minerUser.referred_by_user_id, userId);

            sqlite
              .prepare(
                `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
                 VALUES (?, ?, 'referral_commission', ?, ?, ?, ?, ?)`
              )
              .run(
                `tx_${nanoid(12)}`,
                minerUser.referred_by_user_id,
                share,
                refNextBalance,
                `10% Squad Mining Share from ${minerUser.username || minerUser.name}`,
                session.id,
                now
              );

            referrerCommissionAlert = {
              referrerId: minerUser.referred_by_user_id,
              share,
              minerName: minerUser.username || minerUser.name,
            };
          }
        }
      }

      return { claimedAmount: reward, sessionId: session.id };
    })();

    // Completing a full mining cycle also unlocks any pending referral signup bonus
    awardPendingReferralSignupBonus(userId);

    if (referrerCommissionAlert) {
      const { referrerId, share, minerName } = referrerCommissionAlert as {
        referrerId: string;
        share: number;
        minerName: string;
      };
      createNotification(
        referrerId,
        'referral_commission',
        'Squad Mining Share Received',
        `Wingman ${minerName} completed an extraction cycle. +${share.toLocaleString()} $ODY (10% share) added to your wallet.`,
        { sendPush: false, url: '/squad' }
      );
      emitToUser(referrerId, {
        type: 'wallet_updated',
        data: { reason: 'referral_commission', amount: share },
      });
    }

    return c.json({
      claimedAmount: claimResult.claimedAmount,
      snapshot: getFullPlayerSnapshot(userId),
    });
  } catch (err: unknown) {
    const code = (err as Error).message;
    if (code === 'NO_ACTIVE_SESSION') {
      return c.json({ error: 'No active mining session found to claim.' }, 404);
    }
    if (code === 'SESSION_NOT_COMPLETE') {
      return c.json({ error: 'Mining cycle is still in progress.' }, 400);
    }
    throw err;
  }
});

miningRoutes.post('/upgrade', zValidator('json', upgradePurchaseSchema), (c) => {
  const userId = c.get('userId');
  const { type } = c.req.valid('json');
  const now = Date.now();

  try {
    const upgradeSummary = sqlite.transaction(() => {
      const wallet = sqlite
        .query('SELECT balance FROM wallets WHERE user_id = ?')
        .get(userId) as { balance: number };
      const prog = sqlite
        .query('SELECT ship_level, energy_hours FROM player_progression WHERE user_id = ?')
        .get(userId) as { ship_level: number; energy_hours: number };

      if (type === 'ship') {
        const nextTier = getNextShipUpgrade(prog.ship_level);
        if (!nextTier) {
          throw new Error('MAX_TIER_REACHED');
        }
        if (wallet.balance < nextTier.shipCost) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        const nextBalance = wallet.balance - nextTier.shipCost;
        sqlite
          .prepare('UPDATE wallets SET balance = ?, updated_at = ? WHERE user_id = ?')
          .run(nextBalance, now, userId);

        sqlite
          .prepare('UPDATE player_progression SET ship_level = ?, updated_at = ? WHERE user_id = ?')
          .run(nextTier.shipLevel, now, userId);

        sqlite
          .prepare(
            `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
             VALUES (?, ?, 'upgrade_ship', ?, ?, ?, ?, ?)`
          )
          .run(
            `tx_${nanoid(12)}`,
            userId,
            -nextTier.shipCost,
            nextBalance,
            `Hangar Ship Upgrade: ${nextTier.tool} (Lv.${nextTier.shipLevel})`,
            nextTier.id,
            now
          );

        // Boost active mining session rate & yield
        const activeSession = sqlite
          .query(
            "SELECT id, duration_hours FROM mining_sessions WHERE user_id = ? AND status = 'farming' LIMIT 1"
          )
          .get(userId) as { id: string; duration_hours: number } | null;

        if (activeSession) {
          const boostedReward = calculateMiningReward(
            activeSession.duration_hours,
            nextTier.shipLevel
          );
          sqlite
            .prepare(
              'UPDATE mining_sessions SET rate_per_sec = ?, reward_amount = ? WHERE id = ?'
            )
            .run(nextTier.shipLevel, boostedReward, activeSession.id);
        }

        return { upgraded: nextTier.tool, cost: nextTier.shipCost };
      } else {
        const nextEnergy = getNextEnergyUpgrade(prog.energy_hours);
        if (!nextEnergy) {
          throw new Error('MAX_TIER_REACHED');
        }
        if (wallet.balance < nextEnergy.energyCost) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        const nextBalance = wallet.balance - nextEnergy.energyCost;
        sqlite
          .prepare('UPDATE wallets SET balance = ?, updated_at = ? WHERE user_id = ?')
          .run(nextBalance, now, userId);

        sqlite
          .prepare(
            'UPDATE player_progression SET energy_hours = ?, updated_at = ? WHERE user_id = ?'
          )
          .run(nextEnergy.farmPeriodHours, now, userId);

        sqlite
          .prepare(
            `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
             VALUES (?, ?, 'upgrade_energy', ?, ?, ?, ?, ?)`
          )
          .run(
            `tx_${nanoid(12)}`,
            userId,
            -nextEnergy.energyCost,
            nextBalance,
            `Energy Core Upgrade: ${nextEnergy.tool} (${nextEnergy.farmPeriodHours}h)`,
            nextEnergy.id,
            now
          );

        // Extend active mining session duration & yield
        const activeSession = sqlite
          .query(
            "SELECT id, start_time, rate_per_sec FROM mining_sessions WHERE user_id = ? AND status = 'farming' LIMIT 1"
          )
          .get(userId) as { id: string; start_time: number; rate_per_sec: number } | null;

        if (activeSession) {
          const newEndTime =
            activeSession.start_time + Math.floor(nextEnergy.farmPeriodHours * 3_600_000);
          const boostedReward = calculateMiningReward(
            nextEnergy.farmPeriodHours,
            activeSession.rate_per_sec
          );
          sqlite
            .prepare(
              'UPDATE mining_sessions SET duration_hours = ?, end_time = ?, reward_amount = ? WHERE id = ?'
            )
            .run(nextEnergy.farmPeriodHours, newEndTime, boostedReward, activeSession.id);
        }

        return { upgraded: nextEnergy.tool, cost: nextEnergy.energyCost };
      }
    })();

    return c.json({
      ...upgradeSummary,
      snapshot: getFullPlayerSnapshot(userId),
    });
  } catch (err: unknown) {
    const code = (err as Error).message;
    if (code === 'MAX_TIER_REACHED') {
      return c.json({ error: 'Maximum upgrade tier already unlocked.' }, 400);
    }
    if (code === 'INSUFFICIENT_BALANCE') {
      return c.json({ error: 'Insufficient $ODY balance for this upgrade.' }, 400);
    }
    throw err;
  }
});
