import type { ServerWebSocket } from 'bun';

export interface RealtimeEventPayload {
  type:
    | 'notification'
    | 'wallet_updated'
    | 'announcement'
    | 'mining_updated'
    | 'connected';
  data: Record<string, unknown>;
}

export interface WsClientData {
  userId: string;
}

type SseListener = (payload: RealtimeEventPayload) => void;

const wsClientsByUser = new Map<string, Set<ServerWebSocket<WsClientData>>>();
const sseListenersByUser = new Map<string, Set<SseListener>>();

export function registerWsClient(userId: string, ws: ServerWebSocket<WsClientData>): void {
  let set = wsClientsByUser.get(userId);
  if (!set) {
    set = new Set();
    wsClientsByUser.set(userId, set);
  }
  set.add(ws);
}

export function unregisterWsClient(userId: string, ws: ServerWebSocket<WsClientData>): void {
  const set = wsClientsByUser.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    wsClientsByUser.delete(userId);
  }
}

export function registerSseListener(userId: string, listener: SseListener): () => void {
  let set = sseListenersByUser.get(userId);
  if (!set) {
    set = new Set();
    sseListenersByUser.set(userId, set);
  }
  set.add(listener);

  return () => {
    const current = sseListenersByUser.get(userId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      sseListenersByUser.delete(userId);
    }
  };
}

export function emitToUser(userId: string, payload: RealtimeEventPayload): void {
  const serialized = JSON.stringify(payload);
  const wsSet = wsClientsByUser.get(userId);
  if (wsSet) {
    for (const ws of wsSet) {
      try {
        ws.send(serialized);
      } catch {
        wsSet.delete(ws);
      }
    }
  }

  const sseSet = sseListenersByUser.get(userId);
  if (sseSet) {
    for (const listener of sseSet) {
      try {
        listener(payload);
      } catch {
        sseSet.delete(listener);
      }
    }
  }
}

export function broadcastToAll(payload: RealtimeEventPayload): void {
  const serialized = JSON.stringify(payload);
  for (const [, wsSet] of wsClientsByUser) {
    for (const ws of wsSet) {
      try {
        ws.send(serialized);
      } catch {
        wsSet.delete(ws);
      }
    }
  }

  for (const [, sseSet] of sseListenersByUser) {
    for (const listener of sseSet) {
      try {
        listener(payload);
      } catch {
        sseSet.delete(listener);
      }
    }
  }
}
