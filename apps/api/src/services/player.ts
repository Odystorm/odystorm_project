import { nanoid, customAlphabet } from 'nanoid';
import {
  ECONOMY_CONFIG,
  calculateDailyStreakReward,
  getOfficerRank,
  getShipCombatStats,
  getNextShipUpgrade,
  getNextEnergyUpgrade,
} from '@odystorm/shared';
import { sqlite } from '../db';
import { createNotification } from './push';
import { emitToUser } from '../ws/hub';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || 'admin@odystorm.xyz';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function generateUniqueReferralCode(): string {
  for (let i = 0; i < 20; i++) {
    const candidate = `ODY${generateCode().slice(0, 5)}`;
    const exists = sqlite
      .query('SELECT id FROM user WHERE referral_code = ?')
      .get(candidate);
    if (!exists) return candidate;
  }
  return `ODY${nanoid(8).toUpperCase()}`;
}

export function toUtcDateString(ms: number = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function getYesterdayUtcDateString(ms: number = Date.now()): string {
  return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

function sanitizeCallsign(raw: string, fallbackSuffix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  return cleaned.length >= 3 ? cleaned : `Pilot_${fallbackSuffix}`;
}

export function ensurePlayerInitialized(
  userId: string,
  options?: { pendingReferralCode?: string | null }
): void {
  const now = Date.now();
  const adminEmails = getAdminEmails();

  const tx = sqlite.transaction(() => {
    const u = sqlite
      .query(
        `SELECT id, name, email, is_anonymous, username, role, referral_code, referred_by_user_id, referral_bonus_claimed
         FROM user WHERE id = ?`
      )
      .get(userId) as {
      id: string;
      name: string;
      email: string;
      is_anonymous: number | null;
      username: string | null;
      role: string;
      referral_code: string | null;
      referred_by_user_id: string | null;
      referral_bonus_claimed: number;
    } | null;

    if (!u) return;

    const referralCode = u.referral_code || generateUniqueReferralCode();
    const shouldBeAdmin =
      !u.is_anonymous && adminEmails.has(u.email.toLowerCase()) ? 'admin' : u.role || 'player';
    const username =
      u.username ||
      sanitizeCallsign(
        u.is_anonymous ? `Cadet_${u.id.slice(0, 5)}` : u.name || u.email.split('@')[0],
        u.id.slice(0, 5)
      );

    let referredByUserId = u.referred_by_user_id;
    const trimmedRef = options?.pendingReferralCode?.trim().toUpperCase();
    if (!referredByUserId && trimmedRef && trimmedRef !== referralCode) {
      const referrer = sqlite
        .query('SELECT id FROM user WHERE UPPER(referral_code) = ? AND id != ?')
        .get(trimmedRef, userId) as { id: string } | null;

      if (referrer) {
        referredByUserId = referrer.id;
        sqlite
          .prepare(
            `INSERT OR IGNORE INTO referrals
               (id, referrer_user_id, referred_user_id, signup_bonus_awarded, total_commission_earned, created_at)
             VALUES (?, ?, ?, 0, 0, ?)`
          )
          .run(`ref_${nanoid(12)}`, referrer.id, userId, now);
      }
    }

    sqlite
      .prepare(
        `UPDATE user
         SET referral_code = ?, role = ?, username = ?, referred_by_user_id = ?
         WHERE id = ?`
      )
      .run(referralCode, shouldBeAdmin, username, referredByUserId ?? null, userId);

    const existingWallet = sqlite
      .query('SELECT user_id FROM wallets WHERE user_id = ?')
      .get(userId);

    if (!existingWallet) {
      sqlite
        .prepare(
          `INSERT INTO wallets (user_id, balance, tickets, total_mined, total_earned, last_ticket_refill_date, updated_at)
           VALUES (?, ?, ?, 0, ?, ?, ?)`
        )
        .run(
          userId,
          ECONOMY_CONFIG.STARTING_BALANCE,
          ECONOMY_CONFIG.STARTING_TICKETS,
          ECONOMY_CONFIG.STARTING_BALANCE,
          toUtcDateString(now),
          now
        );

      sqlite
        .prepare(
          `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
           VALUES (?, ?, 'signup_bonus', ?, ?, 'Initial Fleet Enlistment Grant', NULL, ?)`
        )
        .run(
          `tx_${nanoid(12)}`,
          userId,
          ECONOMY_CONFIG.STARTING_BALANCE,
          ECONOMY_CONFIG.STARTING_BALANCE,
          now
        );
    }

    const existingProg = sqlite
      .query('SELECT user_id FROM player_progression WHERE user_id = ?')
      .get(userId);

    if (!existingProg) {
      sqlite
        .prepare(
          `INSERT INTO player_progression
             (user_id, ship_level, energy_hours, active_days_streak, total_active_days, last_checkin_date, best_score, best_wave, updated_at)
           VALUES (?, 1, 1, 0, 0, NULL, 0, 0, ?)`
        )
        .run(userId, now);
    }
  });

  tx();

  // If the user is a registered (non-anonymous) account with an unpaid referral bonus, award it now
  const freshUser = sqlite
    .query('SELECT is_anonymous, referred_by_user_id, referral_bonus_claimed FROM user WHERE id = ?')
    .get(userId) as {
    is_anonymous: number | null;
    referred_by_user_id: string | null;
    referral_bonus_claimed: number;
  } | null;

  if (
    freshUser &&
    !freshUser.is_anonymous &&
    freshUser.referred_by_user_id &&
    !freshUser.referral_bonus_claimed
  ) {
    awardPendingReferralSignupBonus(userId);
  }
}

export function awardPendingReferralSignupBonus(referredUserId: string): boolean {
  const now = Date.now();
  let notifiedReferrerId: string | null = null;
  let referredUsername = 'A new pilot';

  const awarded = sqlite.transaction(() => {
    const referred = sqlite
      .query(
        'SELECT id, username, name, referred_by_user_id, referral_bonus_claimed FROM user WHERE id = ?'
      )
      .get(referredUserId) as {
      id: string;
      username: string | null;
      name: string;
      referred_by_user_id: string | null;
      referral_bonus_claimed: number;
    } | null;

    if (!referred || !referred.referred_by_user_id || referred.referral_bonus_claimed) {
      return false;
    }

    const referrerWallet = sqlite
      .query('SELECT balance, total_earned FROM wallets WHERE user_id = ?')
      .get(referred.referred_by_user_id) as { balance: number; total_earned: number } | null;

    if (!referrerWallet) return false;

    const bonus = ECONOMY_CONFIG.REFERRAL_SIGNUP_BONUS;
    const nextBalance = referrerWallet.balance + bonus;

    sqlite
      .prepare('UPDATE wallets SET balance = ?, total_earned = ?, updated_at = ? WHERE user_id = ?')
      .run(nextBalance, referrerWallet.total_earned + bonus, now, referred.referred_by_user_id);

    sqlite
      .prepare('UPDATE user SET referral_bonus_claimed = 1 WHERE id = ?')
      .run(referredUserId);

    sqlite
      .prepare(
        `INSERT INTO referrals (id, referrer_user_id, referred_user_id, signup_bonus_awarded, total_commission_earned, created_at)
         VALUES (?, ?, ?, ?, 0, ?)
         ON CONFLICT(referred_user_id) DO UPDATE SET signup_bonus_awarded = excluded.signup_bonus_awarded`
      )
      .run(`ref_${nanoid(12)}`, referred.referred_by_user_id, referredUserId, bonus, now);

    sqlite
      .prepare(
        `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
         VALUES (?, ?, 'referral_signup', ?, ?, ?, ?, ?)`
      )
      .run(
        `tx_${nanoid(12)}`,
        referred.referred_by_user_id,
        bonus,
        nextBalance,
        `Squad recruitment bonus for ${referred.username || referred.name}`,
        referredUserId,
        now
      );

    notifiedReferrerId = referred.referred_by_user_id;
    referredUsername = referred.username || referred.name;
    return true;
  })();

  if (awarded && notifiedReferrerId) {
    createNotification(
      notifiedReferrerId,
      'referral_joined',
      'New Wingman Enlisted!',
      `${referredUsername} joined your OdyStorm squad. +${ECONOMY_CONFIG.REFERRAL_SIGNUP_BONUS.toLocaleString()} $ODY credited to your wallet.`,
      { sendPush: true, url: '/squad' }
    );
    emitToUser(notifiedReferrerId, {
      type: 'wallet_updated',
      data: { reason: 'referral_signup' },
    });
  }

  return awarded;
}

/**
 * Transfers all economy, progression, sessions, tasks, and referrals from an anonymous guest
 * user to their newly linked permanent Better Auth user before Better Auth deletes the guest row.
 */
export function mergeAnonymousPlayerIntoUser(anonUserId: string, newUserId: string): void {
  if (!anonUserId || !newUserId || anonUserId === newUserId) return;
  const now = Date.now();
  const adminEmails = getAdminEmails();

  sqlite.transaction(() => {
    const anonUser = sqlite
      .query(
        'SELECT referral_code, referred_by_user_id, referral_bonus_claimed FROM user WHERE id = ?'
      )
      .get(anonUserId) as {
      referral_code: string | null;
      referred_by_user_id: string | null;
      referral_bonus_claimed: number;
    } | null;

    const targetUser = sqlite
      .query('SELECT id, name, email, role, referral_code, referred_by_user_id FROM user WHERE id = ?')
      .get(newUserId) as {
      id: string;
      name: string;
      email: string;
      role: string;
      referral_code: string | null;
      referred_by_user_id: string | null;
    } | null;

    if (!anonUser || !targetUser) return;

    const anonWallet = sqlite
      .query('SELECT * FROM wallets WHERE user_id = ?')
      .get(anonUserId) as {
      balance: number;
      tickets: number;
      total_mined: number;
      total_earned: number;
      last_ticket_refill_date: string | null;
    } | null;

    const targetWallet = sqlite
      .query('SELECT * FROM wallets WHERE user_id = ?')
      .get(newUserId) as {
      balance: number;
      tickets: number;
      total_mined: number;
      total_earned: number;
    } | null;

    if (anonWallet) {
      if (!targetWallet) {
        sqlite.prepare('UPDATE wallets SET user_id = ? WHERE user_id = ?').run(newUserId, anonUserId);
      } else {
        // Subtract duplicate starting grant when merging into an existing wallet
        const mergedBalance =
          targetWallet.balance + Math.max(0, anonWallet.balance - ECONOMY_CONFIG.STARTING_BALANCE);
        const mergedTickets = Math.max(targetWallet.tickets, anonWallet.tickets);
        const mergedMined = targetWallet.total_mined + anonWallet.total_mined;
        const mergedEarned =
          targetWallet.total_earned +
          Math.max(0, anonWallet.total_earned - ECONOMY_CONFIG.STARTING_BALANCE);

        sqlite
          .prepare(
            'UPDATE wallets SET balance = ?, tickets = ?, total_mined = ?, total_earned = ?, updated_at = ? WHERE user_id = ?'
          )
          .run(mergedBalance, mergedTickets, mergedMined, mergedEarned, now, newUserId);
        sqlite.prepare('DELETE FROM wallets WHERE user_id = ?').run(anonUserId);
      }
    }

    const anonProg = sqlite
      .query('SELECT * FROM player_progression WHERE user_id = ?')
      .get(anonUserId) as {
      ship_level: number;
      energy_hours: number;
      active_days_streak: number;
      total_active_days: number;
      last_checkin_date: string | null;
      best_score: number;
      best_wave: number;
    } | null;

    const targetProg = sqlite
      .query('SELECT * FROM player_progression WHERE user_id = ?')
      .get(newUserId) as {
      ship_level: number;
      energy_hours: number;
      active_days_streak: number;
      total_active_days: number;
      last_checkin_date: string | null;
      best_score: number;
      best_wave: number;
    } | null;

    if (anonProg) {
      if (!targetProg) {
        sqlite
          .prepare('UPDATE player_progression SET user_id = ? WHERE user_id = ?')
          .run(newUserId, anonUserId);
      } else {
        sqlite
          .prepare(
            `UPDATE player_progression
             SET ship_level = ?, energy_hours = ?, active_days_streak = ?, total_active_days = ?,
                 last_checkin_date = ?, best_score = ?, best_wave = ?, updated_at = ?
             WHERE user_id = ?`
          )
          .run(
            Math.max(targetProg.ship_level, anonProg.ship_level),
            Math.max(targetProg.energy_hours, anonProg.energy_hours),
            Math.max(targetProg.active_days_streak, anonProg.active_days_streak),
            Math.max(targetProg.total_active_days, anonProg.total_active_days),
            targetProg.last_checkin_date || anonProg.last_checkin_date,
            Math.max(targetProg.best_score, anonProg.best_score),
            Math.max(targetProg.best_wave, anonProg.best_wave),
            now,
            newUserId
          );
        sqlite.prepare('DELETE FROM player_progression WHERE user_id = ?').run(anonUserId);
      }
    }

    // Reassign child records cleanly
    sqlite.prepare('UPDATE mining_sessions SET user_id = ? WHERE user_id = ?').run(newUserId, anonUserId);
    sqlite.prepare('UPDATE game_runs SET user_id = ? WHERE user_id = ?').run(newUserId, anonUserId);
    sqlite.prepare('UPDATE wallet_transactions SET user_id = ? WHERE user_id = ?').run(newUserId, anonUserId);
    sqlite.prepare('UPDATE notifications SET user_id = ? WHERE user_id = ?').run(newUserId, anonUserId);
    sqlite.prepare('UPDATE push_subscriptions SET user_id = ? WHERE user_id = ?').run(newUserId, anonUserId);
    sqlite.prepare('UPDATE referrals SET referrer_user_id = ? WHERE referrer_user_id = ?').run(newUserId, anonUserId);
    sqlite
      .prepare(
        'UPDATE OR IGNORE referrals SET referred_user_id = ? WHERE referred_user_id = ? AND referrer_user_id != ?'
      )
      .run(newUserId, anonUserId, newUserId);
    sqlite
      .prepare('UPDATE OR IGNORE user_tasks SET user_id = ? WHERE user_id = ?')
      .run(newUserId, anonUserId);

    // Carry over referral code & referrer link if newUser doesn't have one
    const preservedRefCode = anonUser.referral_code || targetUser.referral_code || generateUniqueReferralCode();
    if (anonUser.referral_code) {
      sqlite.prepare('UPDATE user SET referral_code = NULL WHERE id = ?').run(anonUserId);
    }

    const preservedReferrer =
      targetUser.referred_by_user_id ||
      (anonUser.referred_by_user_id !== newUserId ? anonUser.referred_by_user_id : null);

    const nextRole = adminEmails.has(targetUser.email.toLowerCase()) ? 'admin' : targetUser.role || 'player';
    const nextUsername = sanitizeCallsign(
      targetUser.name || targetUser.email.split('@')[0],
      newUserId.slice(0, 5)
    );

    sqlite
      .prepare(
        `UPDATE user
         SET is_anonymous = 0,
             referral_code = ?,
             referred_by_user_id = ?,
             referral_bonus_claimed = ?,
             role = ?,
             username = COALESCE(username, ?)
         WHERE id = ?`
      )
      .run(
        preservedRefCode,
        preservedReferrer,
        anonUser.referral_bonus_claimed,
        nextRole,
        nextUsername,
        newUserId
      );
  })();

  ensurePlayerInitialized(newUserId);
  awardPendingReferralSignupBonus(newUserId);
}

export interface DailyCheckinResult {
  awardedToday: boolean;
  rewardAmount: number;
  streak: number;
  ticketsRefilledTo: number;
}

export function processDailyCheckin(userId: string): DailyCheckinResult {
  const now = Date.now();
  const todayUtc = toUtcDateString(now);
  const yesterdayUtc = getYesterdayUtcDateString(now);

  let notifyStreak: { rewardAmount: number; streak: number } | null = null;

  const result = sqlite.transaction((): DailyCheckinResult => {
    const prog = sqlite
      .query(
        'SELECT active_days_streak, total_active_days, last_checkin_date FROM player_progression WHERE user_id = ?'
      )
      .get(userId) as {
      active_days_streak: number;
      total_active_days: number;
      last_checkin_date: string | null;
    } | null;

    const wallet = sqlite
      .query('SELECT balance, tickets, total_earned, last_ticket_refill_date FROM wallets WHERE user_id = ?')
      .get(userId) as {
      balance: number;
      tickets: number;
      total_earned: number;
      last_ticket_refill_date: string | null;
    } | null;

    if (!prog || !wallet) {
      return { awardedToday: false, rewardAmount: 0, streak: 1, ticketsRefilledTo: 5 };
    }

    if (prog.last_checkin_date === todayUtc) {
      return {
        awardedToday: false,
        rewardAmount: 0,
        streak: prog.active_days_streak,
        ticketsRefilledTo: wallet.tickets,
      };
    }

    const nextStreak =
      prog.last_checkin_date === yesterdayUtc ? prog.active_days_streak + 1 : 1;
    const nextTotalDays = prog.total_active_days + 1;
    const rewardAmount = calculateDailyStreakReward(nextStreak);
    const nextBalance = wallet.balance + rewardAmount;
    const nextTickets = Math.max(wallet.tickets, ECONOMY_CONFIG.DAILY_TICKET_BASELINE);

    sqlite
      .prepare(
        `UPDATE player_progression
         SET active_days_streak = ?, total_active_days = ?, last_checkin_date = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .run(nextStreak, nextTotalDays, todayUtc, now, userId);

    sqlite
      .prepare(
        `UPDATE wallets
         SET balance = ?, tickets = ?, total_earned = ?, last_ticket_refill_date = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .run(nextBalance, nextTickets, wallet.total_earned + rewardAmount, todayUtc, now, userId);

    sqlite
      .prepare(
        `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, description, reference_id, created_at)
         VALUES (?, ?, 'daily_streak', ?, ?, ?, ?, ?)`
      )
      .run(
        `tx_${nanoid(12)}`,
        userId,
        rewardAmount,
        nextBalance,
        `Day ${nextStreak} Daily Duty Check-In Bonus`,
        todayUtc,
        now
      );

    notifyStreak = { rewardAmount, streak: nextStreak };

    return {
      awardedToday: true,
      rewardAmount,
      streak: nextStreak,
      ticketsRefilledTo: nextTickets,
    };
  })();

  if (notifyStreak) {
    const { rewardAmount, streak } = notifyStreak as { rewardAmount: number; streak: number };
    createNotification(
      userId,
      'daily_streak',
      `Day ${streak} Duty Check-In`,
      `+${rewardAmount.toLocaleString()} $ODY credited and daily sortie tickets replenished!`,
      { sendPush: false }
    );
  }

  return result;
}

export function getFullPlayerSnapshot(userId: string) {
  ensurePlayerInitialized(userId);
  const dailyCheckin = processDailyCheckin(userId);

  const userRow = sqlite
    .query(
      `SELECT id, name, email, image, is_anonymous, username, role, referral_code, referred_by_user_id, created_at
       FROM user WHERE id = ?`
    )
    .get(userId) as {
    id: string;
    name: string;
    email: string;
    image: string | null;
    is_anonymous: number | null;
    username: string | null;
    role: string;
    referral_code: string;
    referred_by_user_id: string | null;
    created_at: number;
  };

  const walletRow = sqlite
    .query(
      'SELECT balance, tickets, total_mined, total_earned, last_ticket_refill_date FROM wallets WHERE user_id = ?'
    )
    .get(userId) as {
    balance: number;
    tickets: number;
    total_mined: number;
    total_earned: number;
    last_ticket_refill_date: string | null;
  };

  const progRow = sqlite
    .query(
      `SELECT ship_level, energy_hours, active_days_streak, total_active_days, last_checkin_date, best_score, best_wave
       FROM player_progression WHERE user_id = ?`
    )
    .get(userId) as {
    ship_level: number;
    energy_hours: number;
    active_days_streak: number;
    total_active_days: number;
    last_checkin_date: string | null;
    best_score: number;
    best_wave: number;
  };

  const activeSession = sqlite
    .query(
      `SELECT id, start_time, end_time, duration_hours, rate_per_sec, reward_amount, status
       FROM mining_sessions
       WHERE user_id = ? AND status = 'farming'
       ORDER BY start_time DESC LIMIT 1`
    )
    .get(userId) as {
    id: string;
    start_time: number;
    end_time: number;
    duration_hours: number;
    rate_per_sec: number;
    reward_amount: number;
    status: string;
  } | null;

  const unreadRow = sqlite
    .query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(userId) as { count: number };

  const referralCountRow = sqlite
    .query('SELECT COUNT(*) as count FROM referrals WHERE referrer_user_id = ?')
    .get(userId) as { count: number };

  return {
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      image: userRow.image,
      isAnonymous: Boolean(userRow.is_anonymous),
      username: userRow.username || userRow.name,
      role: userRow.role as 'player' | 'admin',
      referralCode: userRow.referral_code,
      referredByUserId: userRow.referred_by_user_id,
      officerRank: getOfficerRank(progRow.ship_level),
    },
    wallet: {
      balance: walletRow.balance,
      tickets: walletRow.tickets,
      totalMined: walletRow.total_mined,
      totalEarned: walletRow.total_earned,
    },
    progression: {
      shipLevel: progRow.ship_level,
      energyHours: progRow.energy_hours,
      activeDaysStreak: progRow.active_days_streak,
      totalActiveDays: progRow.total_active_days,
      bestScore: progRow.best_score,
      bestWave: progRow.best_wave,
      combatStats: getShipCombatStats(progRow.ship_level, progRow.energy_hours),
      nextShipUpgrade: getNextShipUpgrade(progRow.ship_level),
      nextEnergyUpgrade: getNextEnergyUpgrade(progRow.energy_hours),
    },
    activeMiningSession: activeSession
      ? {
          id: activeSession.id,
          startTime: activeSession.start_time,
          endTime: activeSession.end_time,
          durationHours: activeSession.duration_hours,
          ratePerSec: activeSession.rate_per_sec,
          rewardAmount: activeSession.reward_amount,
          isComplete: Date.now() >= activeSession.end_time,
        }
      : null,
    dailyCheckin,
    unreadNotifications: unreadRow.count,
    referralCount: referralCountRow.count,
    serverTime: Date.now(),
  };
}
