import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

const rawDbPath = process.env.SQLITE_DB_PATH || './data/odystorm.db';
const resolvedDbPath =
  rawDbPath === ':memory:' ? ':memory:' : resolve(process.cwd(), rawDbPath);

if (resolvedDbPath !== ':memory:') {
  mkdirSync(dirname(resolvedDbPath), { recursive: true });
}

export const sqlite = new Database(resolvedDbPath, { create: true });

sqlite.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = NORMAL;
`);

export const db = drizzle(sqlite, { schema });

export function initializeDatabase(rawSqlite: Database = sqlite): void {
  rawSqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      is_anonymous INTEGER DEFAULT 0,
      username TEXT,
      role TEXT NOT NULL DEFAULT 'player',
      referral_code TEXT UNIQUE,
      referred_by_user_id TEXT,
      referral_bonus_claimed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_referral_code ON user(referral_code);
    CREATE INDEX IF NOT EXISTS idx_user_referred_by ON user(referred_by_user_id);

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id);

    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS wallets (
      user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 500,
      tickets INTEGER NOT NULL DEFAULT 5,
      total_mined INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 500,
      last_ticket_refill_date TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_progression (
      user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
      ship_level INTEGER NOT NULL DEFAULT 1,
      energy_hours REAL NOT NULL DEFAULT 1,
      active_days_streak INTEGER NOT NULL DEFAULT 0,
      total_active_days INTEGER NOT NULL DEFAULT 0,
      last_checkin_date TEXT,
      best_score INTEGER NOT NULL DEFAULT 0,
      best_wave INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      description TEXT NOT NULL,
      reference_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions(user_id, created_at);

    CREATE TABLE IF NOT EXISTS mining_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      duration_hours REAL NOT NULL,
      rate_per_sec INTEGER NOT NULL,
      reward_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'farming',
      ten_min_reminded INTEGER NOT NULL DEFAULT 0,
      twelve_hour_reminded INTEGER NOT NULL DEFAULT 0,
      claimed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_mining_user_status ON mining_sessions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_mining_status_endtime ON mining_sessions(status, end_time);

    CREATE TABLE IF NOT EXISTS game_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      seed TEXT NOT NULL,
      is_practice INTEGER NOT NULL DEFAULT 0,
      ship_level_snapshot INTEGER NOT NULL DEFAULT 1,
      energy_hours_snapshot REAL NOT NULL DEFAULT 1,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      wave_reached INTEGER NOT NULL DEFAULT 1,
      enemies_destroyed INTEGER NOT NULL DEFAULT 0,
      shards_collected INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      ody_rewarded INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE INDEX IF NOT EXISTS idx_game_runs_user ON game_runs(user_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_game_runs_leaderboard ON game_runs(status, is_practice, score);

    CREATE TABLE IF NOT EXISTS task_definitions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      reward_amount INTEGER NOT NULL,
      task_type TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'ody_logo',
      requirement_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      task_id TEXT NOT NULL REFERENCES task_definitions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'started',
      clicked_at INTEGER,
      claimed_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_task_unique ON user_tasks(user_id, task_id);

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      referred_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      signup_bonus_awarded INTEGER NOT NULL DEFAULT 0,
      total_commission_earned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_unique ON referrals(referred_user_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      author_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      media_url TEXT,
      media_type TEXT NOT NULL DEFAULT 'none',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

export interface DefaultTaskSeed {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  taskType: 'milestone' | 'social_following' | 'combat';
  icon: string;
  requirement: Record<string, unknown>;
  sortOrder: number;
}

export const DEFAULT_TASKS: DefaultTaskSeed[] = [
  // Standalone Web & Community Earn Tasks (no Telegram dependency)
  {
    id: 'task-follow-x',
    title: 'Follow OdyStorm on X',
    description: 'Track fleet dispatches and sector events on X.',
    rewardAmount: 10_000,
    taskType: 'social_following',
    icon: 'x',
    requirement: { url: 'https://x.com/odystorm' },
    sortOrder: 1,
  },
  {
    id: 'task-subscribe-youtube',
    title: 'Subscribe to OdyStorm YouTube',
    description: 'Watch tactical briefings and dev transmissions.',
    rewardAmount: 10_000,
    taskType: 'social_following',
    icon: 'youtube',
    requirement: { url: 'https://www.youtube.com/@odystormofficial' },
    sortOrder: 2,
  },
  {
    id: 'task-follow-tiktok',
    title: 'Follow OdyStorm on TikTok',
    description: 'Catch combat highlights from top fleet pilots.',
    rewardAmount: 10_000,
    taskType: 'social_following',
    icon: 'tiktok',
    requirement: { url: 'https://www.tiktok.com/@odystormofficial' },
    sortOrder: 3,
  },
  // Space Defense Combat Directives
  {
    id: 'task-combat-wave-3',
    title: 'Clear Sector Wave 3 in Space Defense',
    description: 'Survive into Wave 3 during an active Space Defense sortie.',
    rewardAmount: 15_000,
    taskType: 'combat',
    icon: 'combat',
    requirement: { minWave: 3 },
    sortOrder: 4,
  },
  {
    id: 'task-combat-wave-6',
    title: 'Defeat the Wave 5 Dreadnought',
    description: 'Reach Wave 6 after destroying a sector Dreadnought boss.',
    rewardAmount: 35_000,
    taskType: 'combat',
    icon: 'combat',
    requirement: { minWave: 6 },
    sortOrder: 5,
  },
  {
    id: 'task-combat-score-5000',
    title: 'Score 5,000+ in a Single Sortie',
    description: 'Achieve a tactical combat rating of 5,000 points in one run.',
    rewardAmount: 50_000,
    taskType: 'combat',
    icon: 'combat',
    requirement: { minScore: 5_000 },
    sortOrder: 6,
  },
  // Legacy Mining Milestones (50k -> 25.6M $ODY)
  {
    id: 'task-mine-50k',
    title: 'Mine 50,000 $ODY',
    description: 'Accumulate 50,000 $ODY in lifetime extraction & combat yield.',
    rewardAmount: 10_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 50_000 },
    sortOrder: 10,
  },
  {
    id: 'task-mine-100k',
    title: 'Mine 100,000 $ODY',
    description: 'Accumulate 100,000 $ODY in lifetime yield.',
    rewardAmount: 20_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 100_000 },
    sortOrder: 11,
  },
  {
    id: 'task-mine-200k',
    title: 'Mine 200,000 $ODY',
    description: 'Accumulate 200,000 $ODY in lifetime yield.',
    rewardAmount: 40_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 200_000 },
    sortOrder: 12,
  },
  {
    id: 'task-mine-400k',
    title: 'Mine 400,000 $ODY',
    description: 'Accumulate 400,000 $ODY in lifetime yield.',
    rewardAmount: 80_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 400_000 },
    sortOrder: 13,
  },
  {
    id: 'task-mine-800k',
    title: 'Mine 800,000 $ODY',
    description: 'Accumulate 800,000 $ODY in lifetime yield.',
    rewardAmount: 160_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 800_000 },
    sortOrder: 14,
  },
  {
    id: 'task-mine-1600k',
    title: 'Mine 1,600,000 $ODY',
    description: 'Accumulate 1,600,000 $ODY in lifetime yield.',
    rewardAmount: 320_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 1_600_000 },
    sortOrder: 15,
  },
  {
    id: 'task-mine-3200k',
    title: 'Mine 3,200,000 $ODY',
    description: 'Accumulate 3,200,000 $ODY in lifetime yield.',
    rewardAmount: 640_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 3_200_000 },
    sortOrder: 16,
  },
  {
    id: 'task-mine-6400k',
    title: 'Mine 6,400,000 $ODY',
    description: 'Accumulate 6,400,000 $ODY in lifetime yield.',
    rewardAmount: 1_280_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 6_400_000 },
    sortOrder: 17,
  },
  {
    id: 'task-mine-12800k',
    title: 'Mine 12,800,000 $ODY',
    description: 'Accumulate 12,800,000 $ODY in lifetime yield.',
    rewardAmount: 2_560_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 12_800_000 },
    sortOrder: 18,
  },
  {
    id: 'task-mine-25600k',
    title: 'Mine 25,600,000 $ODY',
    description: 'Accumulate 25,600,000 $ODY in lifetime yield.',
    rewardAmount: 5_120_000,
    taskType: 'milestone',
    icon: 'ody_logo',
    requirement: { mineTotal: 25_600_000 },
    sortOrder: 19,
  },
];

export function seedDefaultData(): void {
  const now = Date.now();
  const insertTask = sqlite.prepare(`
    INSERT OR IGNORE INTO task_definitions
      (id, title, description, reward_amount, task_type, icon, requirement_json, is_active, sort_order, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const seedTx = sqlite.transaction(() => {
    for (const task of DEFAULT_TASKS) {
      insertTask.run(
        task.id,
        task.title,
        task.description,
        task.rewardAmount,
        task.taskType,
        task.icon,
        JSON.stringify(task.requirement),
        task.sortOrder,
        now
      );
    }

    const existingAnnouncement = sqlite
      .query('SELECT id FROM announcements LIMIT 1')
      .get();

    if (!existingAnnouncement) {
      sqlite
        .prepare(
          `INSERT INTO announcements (id, author_user_id, title, body, media_url, media_type, created_at)
           VALUES (?, NULL, ?, ?, NULL, 'none', ?)`
        )
        .run(
          'ann-welcome-v2',
          'OdyStorm Command Deck v2 Online',
          'Welcome to the standalone OdyStorm Space Defense Command Deck. Fire up your Mining Reactor, upgrade your vessel in the Hangar, and deploy tickets into live orbital defense sorties to climb the fleet leaderboard.',
          now
        );
    }
  });

  seedTx();
}

initializeDatabase(sqlite);
seedDefaultData();
