process.env.SQLITE_DB_PATH = ':memory:';
process.env.ADMIN_EMAILS = 'commander@odystorm.xyz';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';

import { describe, expect, test } from 'bun:test';

const { app } = await import('../src/app');
const { sqlite } = await import('../src/db');
const { runMaintenanceSweep } = await import('../src/jobs/scheduler');

function extractCookies(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() || [];
  if (setCookies.length > 0) {
    return setCookies.map((c) => c.split(';')[0]).join('; ');
  }
  const raw = res.headers.get('set-cookie');
  return raw ? raw.split(';')[0] : '';
}

async function apiRequest(
  path: string,
  options: { method?: string; body?: unknown; cookie?: string } = {}
) {
  const headers: Record<string, string> = {
    Origin: 'http://localhost:3000',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  return app.request(`http://localhost:3000${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe('OdyStorm v2 Backend API & Authoritative Economy', () => {
  test('Health endpoint & unauthenticated guard work properly', async () => {
    const health = await apiRequest('/api/health');
    expect(health.status).toBe(200);
    const healthJson = (await health.json()) as { status: string };
    expect(healthJson.status).toBe('online');

    const unauth = await apiRequest('/api/player/me');
    expect(unauth.status).toBe(401);
  });

  test('Admin email sign-up grants admin role, initial 500 + 100 daily check-in = 600 $ODY & 5 tickets', async () => {
    const signUpRes = await apiRequest('/api/auth/sign-up/email', {
      method: 'POST',
      body: {
        name: 'Fleet Commander',
        email: 'commander@odystorm.xyz',
        password: 'CommanderPassword123!',
      },
    });
    expect(signUpRes.status).toBe(200);
    const commanderCookie = extractCookies(signUpRes);
    expect(commanderCookie).toContain('better-auth.session_token');

    const meRes = await apiRequest('/api/player/me', { cookie: commanderCookie });
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as {
      user: { id: string; role: string; referralCode: string; isAnonymous: boolean };
      wallet: { balance: number; tickets: number };
      dailyCheckin: { awardedToday: boolean; rewardAmount: number };
    };

    expect(me.user.role).toBe('admin');
    expect(me.user.isAnonymous).toBe(false);
    expect(me.user.referralCode).toMatch(/^ODY/);
    expect(me.dailyCheckin.awardedToday).toBe(true);
    expect(me.dailyCheckin.rewardAmount).toBe(100);
    expect(me.wallet.balance).toBe(600); // 500 enlistment + 100 Day 1 check-in
    expect(me.wallet.tickets).toBe(5);
  });

  test('Guest anonymous play -> referral link -> upgrade to permanent account preserves wallet & pays 5,000 $ODY referral bonus + 10% mining share', async () => {
    // 1. Fetch commander referral code
    const commanderRow = sqlite
      .query("SELECT id, referral_code FROM user WHERE email = 'commander@odystorm.xyz'")
      .get() as { id: string; referral_code: string };

    // 2. Guest signs in anonymously
    const anonRes = await apiRequest('/api/auth/sign-in/anonymous', {
      method: 'POST',
      body: {},
    });
    expect(anonRes.status).toBe(200);
    const guestCookie = extractCookies(anonRes);

    const guestMeRes = await apiRequest('/api/player/me', { cookie: guestCookie });
    const guestMe = (await guestMeRes.json()) as {
      user: { id: string; isAnonymous: boolean };
      wallet: { balance: number };
    };
    expect(guestMe.user.isAnonymous).toBe(true);
    expect(guestMe.wallet.balance).toBe(600);

    // 3. Apply Commander's referral code while still a guest (should NOT pay 5,000 bonus yet to prevent guest bot spam)
    const applyRes = await apiRequest('/api/player/referral/apply', {
      method: 'POST',
      cookie: guestCookie,
      body: { referralCode: commanderRow.referral_code },
    });
    expect(applyRes.status).toBe(200);

    const commanderWalletBefore = sqlite
      .query('SELECT balance FROM wallets WHERE user_id = ?')
      .get(commanderRow.id) as { balance: number };
    expect(commanderWalletBefore.balance).toBe(600);

    // 4. Guest starts a mining session
    const startMineRes = await apiRequest('/api/mining/start', {
      method: 'POST',
      cookie: guestCookie,
    });
    expect(startMineRes.status).toBe(200);

    // Premature claim must be rejected by authoritative server check
    const earlyClaimRes = await apiRequest('/api/mining/claim', {
      method: 'POST',
      cookie: guestCookie,
    });
    expect(earlyClaimRes.status).toBe(400);

    // 5. Guest upgrades to permanent Email/Password account while session cookie is active!
    const linkRes = await apiRequest('/api/auth/sign-up/email', {
      method: 'POST',
      cookie: guestCookie,
      body: {
        name: 'Wingman Nova',
        email: 'nova@odystorm.xyz',
        password: 'NovaPilotPassword123!',
      },
    });
    expect(linkRes.status).toBe(200);
    const novaCookie = extractCookies(linkRes);

    const novaMeRes = await apiRequest('/api/player/me', { cookie: novaCookie });
    const novaMe = (await novaMeRes.json()) as {
      user: { id: string; isAnonymous: boolean; role: string };
      wallet: { balance: number };
      activeMiningSession: { id: string; rewardAmount: number } | null;
    };
    expect(novaMe.user.isAnonymous).toBe(false);
    expect(novaMe.user.role).toBe('player');
    expect(novaMe.activeMiningSession).not.toBeNull();
    expect(novaMe.activeMiningSession?.rewardAmount).toBe(3600);

    // Non-admin user must be blocked from /api/admin/metrics
    const forbiddenAdmin = await apiRequest('/api/admin/metrics', { cookie: novaCookie });
    expect(forbiddenAdmin.status).toBe(403);

    // Commander should now have received the 5,000 $ODY referral signup bonus!
    const commanderWalletAfterLink = sqlite
      .query('SELECT balance FROM wallets WHERE user_id = ?')
      .get(commanderRow.id) as { balance: number };
    expect(commanderWalletAfterLink.balance).toBe(5_600);

    // 6. Fast-forward mining session end_time in DB to test reminder sweep & claim + 10% commission
    sqlite
      .prepare('UPDATE mining_sessions SET start_time = ?, end_time = ? WHERE id = ?')
      .run(
        Date.now() - 5_000_000,
        Date.now() - 1_400_000, // ~23 mins ago (> 10 min reminder threshold)
        novaMe.activeMiningSession!.id
      );

    const sweep = runMaintenanceSweep(Date.now());
    expect(sweep.tenMinAlerts).toBe(1);

    const claimRes = await apiRequest('/api/mining/claim', {
      method: 'POST',
      cookie: novaCookie,
    });
    expect(claimRes.status).toBe(200);
    const claimJson = (await claimRes.json()) as {
      claimedAmount: number;
      snapshot: { wallet: { balance: number } };
    };
    expect(claimJson.claimedAmount).toBe(3600);
    expect(claimJson.snapshot.wallet.balance).toBe(4200); // 600 + 3600

    // Commander receives exact 10% commission (360 $ODY) -> 5600 + 360 = 5960
    const commanderWalletAfterClaim = sqlite
      .query('SELECT balance FROM wallets WHERE user_id = ?')
      .get(commanderRow.id) as { balance: number };
    expect(commanderWalletAfterClaim.balance).toBe(5_960);
  });

  test('Hangar upgrades, Space Defense ticket runs, anti-cheat bounds, and Mission claims work atomically', async () => {
    // Sign in as Commander (admin) to grant Nova test balance via Admin API
    const cmdSignIn = await apiRequest('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: 'commander@odystorm.xyz', password: 'CommanderPassword123!' },
    });
    const cmdCookie = extractCookies(cmdSignIn);

    const novaSignIn = await apiRequest('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: 'nova@odystorm.xyz', password: 'NovaPilotPassword123!' },
    });
    const novaCookie = extractCookies(novaSignIn);

    const novaRow = sqlite
      .query("SELECT id FROM user WHERE email = 'nova@odystorm.xyz'")
      .get() as { id: string };

    // Admin grants +120,000 $ODY to Nova
    const grantRes = await apiRequest(`/api/admin/users/${novaRow.id}`, {
      method: 'PATCH',
      cookie: cmdCookie,
      body: { balanceDelta: 120_000 },
    });
    expect(grantRes.status).toBe(200);

    // Nova buys Lv.2 Mining Ship (80,000 $ODY) and 2h Energy Core (40,000 $ODY)
    const buyShipRes = await apiRequest('/api/mining/upgrade', {
      method: 'POST',
      cookie: novaCookie,
      body: { type: 'ship' },
    });
    expect(buyShipRes.status).toBe(200);

    const buyEnergyRes = await apiRequest('/api/mining/upgrade', {
      method: 'POST',
      cookie: novaCookie,
      body: { type: 'energy' },
    });
    expect(buyEnergyRes.status).toBe(200);
    const upgraded = (await buyEnergyRes.json()) as {
      snapshot: {
        progression: { shipLevel: number; energyHours: number };
        wallet: { balance: number };
      };
    };
    expect(upgraded.snapshot.progression.shipLevel).toBe(2);
    expect(upgraded.snapshot.progression.energyHours).toBe(2);
    expect(upgraded.snapshot.wallet.balance).toBe(4_200); // 4200 + 120000 - 80000 - 40000

    // Start Space Defense sortie (spends 1 ticket: 5 -> 4)
    const startRunRes = await apiRequest('/api/game/start', {
      method: 'POST',
      cookie: novaCookie,
      body: { practice: false },
    });
    expect(startRunRes.status).toBe(200);
    const startRun = (await startRunRes.json()) as {
      runId: string;
      remainingTickets: number;
    };
    expect(startRun.remainingTickets).toBe(4);

    // Backdate started_at by 45 seconds so elapsed time allows Wave 4 scoring
    sqlite
      .prepare('UPDATE game_runs SET started_at = ? WHERE id = ?')
      .run(Date.now() - 45_000, startRun.runId);

    const finishRunRes = await apiRequest('/api/game/finish', {
      method: 'POST',
      cookie: novaCookie,
      body: {
        runId: startRun.runId,
        waveReached: 4,
        asteroidsDestroyed: 25,
        scoutsDestroyed: 18,
        cruisersDestroyed: 5,
        bossesDestroyed: 0,
        shardsCollected: 12,
      },
    });
    expect(finishRunRes.status).toBe(200);
    const finishRun = (await finishRunRes.json()) as {
      waveReached: number;
      score: number;
      odyRewarded: number;
      isNewHighScore: boolean;
    };
    expect(finishRun.waveReached).toBe(4);
    expect(finishRun.score).toBeGreaterThan(3_000);
    expect(finishRun.odyRewarded).toBeGreaterThan(2_500);
    expect(finishRun.isNewHighScore).toBe(true);

    // Wave 3 Combat Mission ('task-combat-wave-3') should now be claimable!
    const claimCombatTask = await apiRequest('/api/tasks/claim', {
      method: 'POST',
      cookie: novaCookie,
      body: { taskId: 'task-combat-wave-3' },
    });
    expect(claimCombatTask.status).toBe(200);
    const claimedTaskJson = (await claimCombatTask.json()) as { rewardAmount: number };
    expect(claimedTaskJson.rewardAmount).toBe(15_000);

    // Leaderboard reflects Nova's run
    const lbRes = await apiRequest('/api/game/leaderboard');
    expect(lbRes.status).toBe(200);
    const lbJson = (await lbRes.json()) as {
      allTime: Array<{ callsign: string; bestScore: number }>;
    };
    expect(lbJson.allTime.length).toBeGreaterThanOrEqual(1);
    expect(lbJson.allTime[0].bestScore).toBe(finishRun.score);
  });
});
