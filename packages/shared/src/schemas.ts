import { z } from 'zod';

export const upgradePurchaseSchema = z.object({
  type: z.enum(['ship', 'energy']),
});

export const applyReferralSchema = z.object({
  referralCode: z.string().trim().min(3).max(32),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'Callsign may only contain letters, numbers, and underscores')
    .optional(),
});

export const startGameRunSchema = z.object({
  practice: z.boolean().optional().default(false),
});

export const finishGameRunSchema = z.object({
  runId: z.string().min(6),
  waveReached: z.number().int().min(1).max(200),
  asteroidsDestroyed: z.number().int().min(0).max(10_000),
  scoutsDestroyed: z.number().int().min(0).max(10_000),
  cruisersDestroyed: z.number().int().min(0).max(5_000),
  bossesDestroyed: z.number().int().min(0).max(200),
  shardsCollected: z.number().int().min(0).max(10_000),
});

export const taskActionSchema = z.object({
  taskId: z.string().min(2),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(6),
  }),
});

export const adminCreateTaskSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(240).optional().default(''),
  rewardAmount: z.number().int().min(50).max(50_000_000),
  taskType: z.enum(['milestone', 'social_following', 'combat']),
  icon: z.string().trim().min(1).max(40).default('ody_logo'),
  requirement: z.object({
    mineTotal: z.number().int().min(0).optional(),
    url: z.string().url().optional(),
    minWave: z.number().int().min(1).optional(),
    minScore: z.number().int().min(0).optional(),
  }),
  isActive: z.boolean().optional().default(true),
});

export const adminUpdateTaskSchema = adminCreateTaskSchema.partial();

export const adminBroadcastSchema = z.object({
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(5).max(2_000),
  mediaUrl: z.string().url().optional().or(z.literal('')),
  mediaType: z.enum(['none', 'image', 'video']).optional().default('none'),
  sendWebPush: z.boolean().optional().default(true),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(['player', 'admin']).optional(),
  balanceDelta: z.number().int().min(-10_000_000).max(10_000_000).optional(),
  ticketsDelta: z.number().int().min(-100).max(500).optional(),
});

export type UpgradePurchaseInput = z.infer<typeof upgradePurchaseSchema>;
export type StartGameRunInput = z.infer<typeof startGameRunSchema>;
export type FinishGameRunInput = z.infer<typeof finishGameRunSchema>;
export type AdminCreateTaskInput = z.infer<typeof adminCreateTaskSchema>;
export type AdminBroadcastInput = z.infer<typeof adminBroadcastSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
