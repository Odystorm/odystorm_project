import { getShipCombatStats } from './upgrades';

export const ECONOMY_CONFIG = {
  STARTING_BALANCE: 500,
  STARTING_TICKETS: 5,
  DAILY_TICKET_BASELINE: 5,
  DAILY_STREAK_BASE_REWARD: 100,
  DAILY_STREAK_STEP_BONUS: 25,
  DAILY_STREAK_MAX_REWARD: 500,
  REFERRAL_SIGNUP_BONUS: 5_000,
  REFERRAL_MINING_SHARE_RATE: 0.1, // 10%
  SOCIAL_TASK_VERIFY_COOLDOWN_MS: 15_000, // 15 seconds
} as const;

export function calculateDailyStreakReward(streakDay: number): number {
  const clampedDay = Math.max(1, Math.floor(streakDay));
  return Math.min(
    ECONOMY_CONFIG.DAILY_STREAK_MAX_REWARD,
    ECONOMY_CONFIG.DAILY_STREAK_BASE_REWARD +
      (clampedDay - 1) * ECONOMY_CONFIG.DAILY_STREAK_STEP_BONUS
  );
}

export const SPACE_DEFENSE_CONFIG = {
  MIN_RUN_DURATION_MS: 1_500,
  MAX_RUN_DURATION_MS: 20 * 60 * 1000, // 20 minutes max session TTL
  WAVE_DURATION_SEC: 20,
  POINTS: {
    ASTEROID: 30,
    SCOUT: 75,
    CRUISER: 180,
    BOSS: 900,
    SHARD: 60,
  },
  BASE_ODY_PER_SCORE_POINT: 0.85,
  MAX_ODY_PER_RUN_BASE: 25_000,
} as const;

export interface RunSubmissionMetrics {
  elapsedMs: number;
  waveReached: number;
  asteroidsDestroyed: number;
  scoutsDestroyed: number;
  cruisersDestroyed: number;
  bossesDestroyed: number;
  shardsCollected: number;
  shipLevel: number;
  energyHours: number;
  isPractice: boolean;
}

export interface ValidatedRunResult {
  valid: boolean;
  reason?: string;
  sanitizedWave: number;
  enemiesDestroyed: number;
  score: number;
  odyReward: number;
}

/**
 * Server-authoritative plausibility check & reward computation for Space Defense runs.
 * Rejects impossible kill/wave rates relative to real server-elapsed time.
 */
export function validateAndScoreRun(metrics: RunSubmissionMetrics): ValidatedRunResult {
  const {
    elapsedMs,
    waveReached,
    asteroidsDestroyed,
    scoutsDestroyed,
    cruisersDestroyed,
    bossesDestroyed,
    shardsCollected,
    shipLevel,
    energyHours,
    isPractice,
  } = metrics;

  if (elapsedMs < SPACE_DEFENSE_CONFIG.MIN_RUN_DURATION_MS) {
    return {
      valid: false,
      reason: 'Run duration too short.',
      sanitizedWave: 1,
      enemiesDestroyed: 0,
      score: 0,
      odyReward: 0,
    };
  }

  const cappedElapsedSec = Math.min(
    SPACE_DEFENSE_CONFIG.MAX_RUN_DURATION_MS / 1000,
    Math.max(1.5, elapsedMs / 1000)
  );

  // Max plausible wave given 12s minimum clear speed per wave + generous buffer
  const maxPlausibleWave = Math.max(2, Math.ceil(cappedElapsedSec / 10) + 2);
  const sanitizedWave = Math.max(1, Math.min(waveReached, maxPlausibleWave));

  // Clamp kill counts to generous physical spawn ceilings per second
  const maxAsteroids = Math.ceil(cappedElapsedSec * 3.5) + 10;
  const maxScouts = Math.ceil(cappedElapsedSec * 2.5) + 8;
  const maxCruisers = Math.ceil(cappedElapsedSec * 0.9) + 4;
  const maxBosses = Math.floor(sanitizedWave / 5) + 2;
  const maxShards = Math.ceil(cappedElapsedSec * 2.5) + 10;

  const safeAsteroids = Math.max(0, Math.min(Math.floor(asteroidsDestroyed), maxAsteroids));
  const safeScouts = Math.max(0, Math.min(Math.floor(scoutsDestroyed), maxScouts));
  const safeCruisers = Math.max(0, Math.min(Math.floor(cruisersDestroyed), maxCruisers));
  const safeBosses = Math.max(0, Math.min(Math.floor(bossesDestroyed), maxBosses));
  const safeShards = Math.max(0, Math.min(Math.floor(shardsCollected), maxShards));

  const enemiesDestroyed = safeAsteroids + safeScouts + safeCruisers + safeBosses;

  const rawScore =
    safeAsteroids * SPACE_DEFENSE_CONFIG.POINTS.ASTEROID +
    safeScouts * SPACE_DEFENSE_CONFIG.POINTS.SCOUT +
    safeCruisers * SPACE_DEFENSE_CONFIG.POINTS.CRUISER +
    safeBosses * SPACE_DEFENSE_CONFIG.POINTS.BOSS +
    safeShards * SPACE_DEFENSE_CONFIG.POINTS.SHARD +
    (sanitizedWave - 1) * 150;

  const combatStats = getShipCombatStats(shipLevel, energyHours);
  const score = Math.floor(rawScore);

  if (isPractice) {
    return {
      valid: true,
      sanitizedWave,
      enemiesDestroyed,
      score,
      odyReward: 0,
    };
  }

  const maxOdyCap = Math.floor(
    SPACE_DEFENSE_CONFIG.MAX_ODY_PER_RUN_BASE * combatStats.rewardMultiplier
  );

  const odyReward = Math.min(
    maxOdyCap,
    Math.max(
      score > 0 ? 50 : 0,
      Math.floor(
        score * SPACE_DEFENSE_CONFIG.BASE_ODY_PER_SCORE_POINT * combatStats.rewardMultiplier
      )
    )
  );

  return {
    valid: true,
    sanitizedWave,
    enemiesDestroyed,
    score,
    odyReward,
  };
}
