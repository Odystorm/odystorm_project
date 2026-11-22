import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ============================================================================
// Better Auth Core Tables + OdyStorm Player Identity Fields
// ============================================================================

export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    isAnonymous: integer('is_anonymous', { mode: 'boolean' }).default(false),
    username: text('username'),
    role: text('role').notNull().default('player'), // 'player' | 'admin'
    referralCode: text('referral_code').unique(),
    referredByUserId: text('referred_by_user_id'),
    referralBonusClaimed: integer('referral_bonus_claimed', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_referral_code').on(table.referralCode),
    index('idx_user_referred_by').on(table.referredByUserId),
  ]
);

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('idx_session_user_id').on(table.userId)]
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('idx_account_user_id').on(table.userId)]
);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ============================================================================
// Economy, Hangar Progression & Mining Tables
// ============================================================================

export const wallets = sqliteTable('wallets', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(500),
  tickets: integer('tickets').notNull().default(5),
  totalMined: integer('total_mined').notNull().default(0),
  totalEarned: integer('total_earned').notNull().default(500),
  lastTicketRefillDate: text('last_ticket_refill_date'), // YYYY-MM-DD UTC
  updatedAt: integer('updated_at').notNull(),
});

export const playerProgression = sqliteTable('player_progression', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  shipLevel: integer('ship_level').notNull().default(1),
  energyHours: real('energy_hours').notNull().default(1),
  activeDaysStreak: integer('active_days_streak').notNull().default(0),
  totalActiveDays: integer('total_active_days').notNull().default(0),
  lastCheckinDate: text('last_checkin_date'), // YYYY-MM-DD UTC
  bestScore: integer('best_score').notNull().default(0),
  bestWave: integer('best_wave').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

export const walletTransactions = sqliteTable(
  'wallet_transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // signup_bonus | daily_streak | mining_claim | referral_signup | referral_commission | upgrade_ship | upgrade_energy | task_reward | space_defense_reward | admin_adjustment
    amount: integer('amount').notNull(), // positive credit or negative debit
    balanceAfter: integer('balance_after').notNull(),
    description: text('description').notNull(),
    referenceId: text('reference_id'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_wallet_tx_user_created').on(table.userId, table.createdAt)]
);

export const miningSessions = sqliteTable(
  'mining_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    startTime: integer('start_time').notNull(), // unix ms
    endTime: integer('end_time').notNull(), // unix ms
    durationHours: real('duration_hours').notNull(),
    ratePerSec: integer('rate_per_sec').notNull(),
    rewardAmount: integer('reward_amount').notNull(),
    status: text('status').notNull().default('farming'), // 'farming' | 'claimed'
    tenMinReminded: integer('ten_min_reminded', { mode: 'boolean' }).notNull().default(false),
    twelveHourReminded: integer('twelve_hour_reminded', { mode: 'boolean' })
      .notNull()
      .default(false),
    claimedAt: integer('claimed_at'),
  },
  (table) => [
    index('idx_mining_user_status').on(table.userId, table.status),
    index('idx_mining_status_endtime').on(table.status, table.endTime),
  ]
);

// ============================================================================
// Space Defense Arcade Runs & Leaderboards
// ============================================================================

export const gameRuns = sqliteTable(
  'game_runs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    seed: text('seed').notNull(),
    isPractice: integer('is_practice', { mode: 'boolean' }).notNull().default(false),
    shipLevelSnapshot: integer('ship_level_snapshot').notNull().default(1),
    energyHoursSnapshot: real('energy_hours_snapshot').notNull().default(1),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    waveReached: integer('wave_reached').notNull().default(1),
    enemiesDestroyed: integer('enemies_destroyed').notNull().default(0),
    shardsCollected: integer('shards_collected').notNull().default(0),
    score: integer('score').notNull().default(0),
    odyRewarded: integer('ody_rewarded').notNull().default(0),
    status: text('status').notNull().default('active'), // 'active' | 'completed' | 'expired'
  },
  (table) => [
    index('idx_game_runs_user').on(table.userId, table.startedAt),
    index('idx_game_runs_leaderboard').on(table.status, table.isPractice, table.score),
  ]
);

// ============================================================================
// Missions / Tasks & Referrals
// ============================================================================

export const taskDefinitions = sqliteTable('task_definitions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  rewardAmount: integer('reward_amount').notNull(),
  taskType: text('task_type').notNull(), // 'milestone' | 'social_following' | 'combat'
  icon: text('icon').notNull().default('ody_logo'),
  requirementJson: text('requirement_json').notNull(), // JSON: { mineTotal?, url?, minWave?, minScore? }
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const userTasks = sqliteTable(
  'user_tasks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    taskId: text('task_id')
      .notNull()
      .references(() => taskDefinitions.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('started'), // 'started' | 'claimed'
    clickedAt: integer('clicked_at'),
    claimedAt: integer('claimed_at'),
  },
  (table) => [uniqueIndex('idx_user_task_unique').on(table.userId, table.taskId)]
);

export const referrals = sqliteTable(
  'referrals',
  {
    id: text('id').primaryKey(),
    referrerUserId: text('referrer_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    referredUserId: text('referred_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    signupBonusAwarded: integer('signup_bonus_awarded').notNull().default(0),
    totalCommissionEarned: integer('total_commission_earned').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_referrals_referred_unique').on(table.referredUserId),
    index('idx_referrals_referrer').on(table.referrerUserId),
  ]
);

// ============================================================================
// Notifications, Admin Broadcasts & Web Push Subscriptions
// ============================================================================

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  authorUserId: text('author_user_id').references(() => user.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  mediaUrl: text('media_url'),
  mediaType: text('media_type').notNull().default('none'), // 'none' | 'image' | 'video'
  createdAt: integer('created_at').notNull(),
});

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'mining_complete' | 'referral_joined' | 'referral_commission' | 'daily_streak' | 'broadcast' | 'system'
    title: text('title').notNull(),
    body: text('body').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_notifications_user_created').on(table.userId, table.createdAt)]
);

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_push_sub_user').on(table.userId)]
);

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
