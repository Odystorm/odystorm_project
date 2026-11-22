import { app } from './app';
import { auth } from './auth';
import { startScheduler } from './jobs/scheduler';
import { registerWsClient, unregisterWsClient, type WsClientData } from './ws/hub';

const port = Number(process.env.API_PORT || 4000);

startScheduler(60_000);

const server = Bun.serve<WsClientData>({
  port,
  async fetch(req, srv) {
    const url = new URL(req.url);

    // Native Bun WebSocket upgrade at /ws authenticated via Better Auth session cookie
    if (url.pathname === '/ws') {
      const sessionData = await auth.api.getSession({ headers: req.headers });
      if (!sessionData?.user?.id) {
        return new Response('Unauthorized WebSocket handshake', { status: 401 });
      }
      const upgraded = srv.upgrade(req, {
        data: { userId: sessionData.user.id },
      });
      if (upgraded) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    return app.fetch(req, srv);
  },
  websocket: {
    open(ws) {
      registerWsClient(ws.data.userId, ws);
      ws.send(
        JSON.stringify({
          type: 'connected',
          data: { userId: ws.data.userId, ts: Date.now() },
        })
      );
    },
    message(ws, message) {
      if (message === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', data: { ts: Date.now() } }));
      }
    },
    close(ws) {
      unregisterWsClient(ws.data.userId, ws);
    },
  },
});

console.log(`[OdyStorm Bun API] Listening on http://127.0.0.1:${server.port}`);
