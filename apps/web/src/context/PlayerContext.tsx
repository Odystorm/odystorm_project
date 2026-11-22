'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { apiFetch, type PlayerSnapshot } from '@/lib/api';

export interface ToastMessage {
  id: string;
  title: string;
  body?: string;
  tone?: 'cyan' | 'amber' | 'error';
}

export type AuthModalMode = 'signin' | 'signup' | 'upgrade' | null;

interface PlayerContextValue {
  player: PlayerSnapshot | null;
  loading: boolean;
  enabledSocialProviders: string[];
  refreshPlayer: () => Promise<PlayerSnapshot | null>;
  setPlayerSnapshot: (snapshot: PlayerSnapshot) => void;
  pushToast: (title: string, body?: string, tone?: 'cyan' | 'amber' | 'error') => void;
  authModalMode: AuthModalMode;
  setAuthModalMode: (mode: AuthModalMode) => void;
  pendingInviteCode: string | null;
  storeInviteCode: (code: string) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabledSocialProviders, setEnabledSocialProviders] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const greetedStreakRef = useRef(false);

  const pushToast = useCallback(
    (title: string, body?: string, tone: 'cyan' | 'amber' | 'error' = 'cyan') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, body, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const storeInviteCode = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setPendingInviteCode(clean);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('odystorm_invite_code', clean);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      storeInviteCode(refParam);
    } else {
      const stored = window.localStorage.getItem('odystorm_invite_code');
      if (stored) setPendingInviteCode(stored);
    }

    // Register Service Worker for PWA & Web Push
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, [storeInviteCode]);

  const refreshPlayer = useCallback(async (): Promise<PlayerSnapshot | null> => {
    try {
      const snapshot = await apiFetch<PlayerSnapshot>('/api/player/me');
      setPlayer(snapshot);
      if (snapshot.enabledSocialProviders) {
        setEnabledSocialProviders(snapshot.enabledSocialProviders);
      }

      if (snapshot.dailyCheckin?.awardedToday && !greetedStreakRef.current) {
        greetedStreakRef.current = true;
        pushToast(
          `Day ${snapshot.dailyCheckin.streak} Duty Check-In`,
          `+${snapshot.dailyCheckin.rewardAmount.toLocaleString()} $ODY credited & sortie tickets replenished.`,
          'amber'
        );
      }

      // Apply stored invite code once authenticated if not yet linked
      const savedRef =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('odystorm_invite_code')
          : null;
      if (
        savedRef &&
        !snapshot.user.referredByUserId &&
        savedRef.toUpperCase() !== snapshot.user.referralCode.toUpperCase()
      ) {
        window.localStorage.removeItem('odystorm_invite_code');
        setPendingInviteCode(null);
        try {
          const applied = await apiFetch<{ applied: boolean; referrerName?: string }>(
            '/api/player/referral/apply',
            {
              method: 'POST',
              body: { referralCode: savedRef },
            }
          );
          if (applied.applied) {
            pushToast(
              'Squadron Linked!',
              `Connected to Commander ${applied.referrerName}.`,
              'amber'
            );
            const updated = await apiFetch<PlayerSnapshot>('/api/player/me');
            setPlayer(updated);
            return updated;
          }
        } catch {
          // Ignore invalid or self codes silently
        }
      }

      return snapshot;
    } catch {
      setPlayer(null);
      try {
        const pubCfg = await apiFetch<{ enabledSocialProviders: string[] }>('/api/player/config');
        setEnabledSocialProviders(pubCfg.enabledSocialProviders || []);
      } catch {
        // Ignore offline initial fetch
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void refreshPlayer();
  }, [refreshPlayer]);

  // Live SSE Event Stream (works seamlessly across local & reverse-proxied ports)
  useEffect(() => {
    if (!player?.user?.id || typeof window === 'undefined') return;

    const es = new EventSource('/api/notifications/stream', { withCredentials: true });

    es.addEventListener('notification', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          title: string;
          body: string;
        };
        pushToast(data.title, data.body, 'cyan');
        void refreshPlayer();
      } catch {
        // ignore malformed event
      }
    });

    es.addEventListener('wallet_updated', () => {
      void refreshPlayer();
    });

    es.addEventListener('announcement', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          title: string;
          body: string;
        };
        pushToast(`Fleet Dispatch: ${data.title}`, data.body, 'amber');
        void refreshPlayer();
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
    };
  }, [player?.user?.id, pushToast, refreshPlayer]);

  return (
    <PlayerContext.Provider
      value={{
        player,
        loading,
        enabledSocialProviders,
        refreshPlayer,
        setPlayerSnapshot: setPlayer,
        pushToast,
        authModalMode,
        setAuthModalMode,
        pendingInviteCode,
        storeInviteCode,
      }}
    >
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.tone || 'cyan'}`}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t.title}</div>
            {t.body && (
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '3px',
                }}
              >
                {t.body}
              </div>
            )}
          </div>
        ))}
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used inside PlayerProvider');
  }
  return ctx;
}
