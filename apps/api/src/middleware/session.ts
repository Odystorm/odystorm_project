import { createMiddleware } from 'hono/factory';
import { auth } from '../auth';
import { sqlite } from '../db';
import { ensurePlayerInitialized } from '../services/player';

export interface AuthSessionVariables {
  userId: string;
  userRole: 'player' | 'admin';
  isAnonymous: boolean;
}

export const requireAuth = createMiddleware<{ Variables: AuthSessionVariables }>(
  async (c, next) => {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!sessionData?.user?.id) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const userId = sessionData.user.id;
    ensurePlayerInitialized(userId);

    const row = sqlite
      .query('SELECT role, is_anonymous FROM user WHERE id = ?')
      .get(userId) as { role: string; is_anonymous: number | null } | null;

    c.set('userId', userId);
    c.set('userRole', (row?.role === 'admin' ? 'admin' : 'player') as 'player' | 'admin');
    c.set('isAnonymous', Boolean(row?.is_anonymous));

    await next();
  }
);

export const requireAdmin = createMiddleware<{ Variables: AuthSessionVariables }>(
  async (c, next) => {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!sessionData?.user?.id) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const userId = sessionData.user.id;
    ensurePlayerInitialized(userId);

    const row = sqlite
      .query('SELECT role, is_anonymous FROM user WHERE id = ?')
      .get(userId) as { role: string; is_anonymous: number | null } | null;

    if (row?.role !== 'admin') {
      return c.json({ error: 'Admin clearance required' }, 403);
    }

    c.set('userId', userId);
    c.set('userRole', 'admin');
    c.set('isAnonymous', Boolean(row?.is_anonymous));

    await next();
  }
);
