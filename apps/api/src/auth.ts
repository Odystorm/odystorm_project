import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { anonymous } from 'better-auth/plugins';
import { customAlphabet } from 'nanoid';
import { db } from './db';
import * as schema from './db/schema';
import { ensurePlayerInitialized, mergeAnonymousPlayerIntoUser } from './services/player';

const randomTag = customAlphabet('0123456789ABCDEF', 4);

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  socialProviders.discord = {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  };
}
if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  socialProviders.twitter = {
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  };
}

export function getEnabledSocialProviders(): string[] {
  return Object.keys(socialProviders);
}

const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const auth = betterAuth({
  baseURL: appUrl,
  secret:
    process.env.BETTER_AUTH_SECRET ||
    'odystorm-dev-secret-change-in-production-32chars',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  socialProviders,
  trustedOrigins: [
    appUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
  ],
  user: {
    additionalFields: {
      username: {
        type: 'string',
        required: false,
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'player',
        input: false,
      },
      referralCode: {
        type: 'string',
        required: false,
        input: false,
      },
      referredByUserId: {
        type: 'string',
        required: false,
        input: false,
      },
      referralBonusClaimed: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          ensurePlayerInitialized(createdUser.id);
        },
      },
    },
  },
  plugins: [
    anonymous({
      emailDomainName: 'guest.odystorm.local',
      generateName: () => `Cadet-${randomTag()}`,
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        mergeAnonymousPlayerIntoUser(anonymousUser.user.id, newUser.user.id);
      },
    }),
  ],
});
