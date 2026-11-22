import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth';
import { playerRoutes } from './routes/player';
import { miningRoutes } from './routes/mining';
import { gameRoutes } from './routes/game';
import { taskRoutes } from './routes/tasks';
import { referralRoutes } from './routes/referrals';
import { notificationRoutes } from './routes/notifications';
import { statsRoutes } from './routes/stats';
import { adminRoutes } from './routes/admin';

export const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || 'http://localhost:3000',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app.get('/api/health', (c) =>
  c.json({
    status: 'online',
    service: 'odystorm-api',
    runtime: 'bun',
    timestamp: Date.now(),
  })
);

// Better Auth endpoints (/api/auth/*)
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// Domain routes
app.route('/api/player', playerRoutes);
app.route('/api/mining', miningRoutes);
app.route('/api/game', gameRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/referrals', referralRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/stats', statsRoutes);
app.route('/api/admin', adminRoutes);

app.onError((err, c) => {
  console.error('[OdyStorm API Error]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export type AppType = typeof app;
