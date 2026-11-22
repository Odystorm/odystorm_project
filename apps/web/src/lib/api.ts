import type { HangarUpgradeTier, ShipCombatStats } from '@odystorm/shared';

export interface PlayerSnapshot {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    isAnonymous: boolean;
    username: string;
    role: 'player' | 'admin';
    referralCode: string;
    referredByUserId: string | null;
    officerRank: string;
  };
  wallet: {
    balance: number;
    tickets: number;
    totalMined: number;
    totalEarned: number;
  };
  progression: {
    shipLevel: number;
    energyHours: number;
    activeDaysStreak: number;
    totalActiveDays: number;
    bestScore: number;
    bestWave: number;
    combatStats: ShipCombatStats;
    nextShipUpgrade: HangarUpgradeTier | null;
    nextEnergyUpgrade: HangarUpgradeTier | null;
  };
  activeMiningSession: {
    id: string;
    startTime: number;
    endTime: number;
    durationHours: number;
    ratePerSec: number;
    rewardAmount: number;
    isComplete: boolean;
  } | null;
  dailyCheckin: {
    awardedToday: boolean;
    rewardAmount: number;
    streak: number;
    ticketsRefilledTo: number;
  };
  unreadNotifications: number;
  referralCount: number;
  serverTime: number;
  enabledSocialProviders?: string[];
  vapidPublicKey?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: options.method || 'GET',
    credentials: 'include',
    headers:
      options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
