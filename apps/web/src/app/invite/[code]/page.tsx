'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';
import { AuthForm } from '@/components/shell/AuthForm';

interface InviteResolution {
  valid: boolean;
  referralCode: string;
  commanderName: string;
  officerRank: string;
  signupBonus: number;
  commissionPercent: number;
}

export default function InviteLandingPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { player, storeInviteCode, refreshPlayer, pushToast } = usePlayer();
  const [inviteInfo, setInviteInfo] = useState<InviteResolution | null>(null);
  const [launchingGuest, setLaunchingGuest] = useState(false);

  const code = (params?.code || '').toUpperCase();

  useEffect(() => {
    if (!code) return;
    storeInviteCode(code);

    apiFetch<InviteResolution>(`/api/referrals/resolve/${encodeURIComponent(code)}`)
      .then((info) => setInviteInfo(info))
      .catch(() => setInviteInfo(null));
  }, [code, storeInviteCode]);

  useEffect(() => {
    if (player) {
      router.replace('/');
    }
  }, [player, router]);

  async function handleGuestJoin() {
    setLaunchingGuest(true);
    try {
      const { error } = await authClient.signIn.anonymous();
      if (error) {
        pushToast('Launch Failed', error.message, 'error');
        return;
      }
      await refreshPlayer();
      router.replace('/');
    } finally {
      setLaunchingGuest(false);
    }
  }

  return (
    <main className="enlist-screen">
      <div className="enlist-grid">
        <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/images/logo/logo.svg" alt="OdyStorm Logo" width={54} height={54} />
            <div>
              <div className="page-eyebrow">Squadron Transmission</div>
              <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
                {inviteInfo
                  ? `${inviteInfo.commanderName} Invited You`
                  : 'Join OdyStorm Space Defense'}
              </h1>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', maxWidth: '52ch' }}>
            {inviteInfo ? (
              <>
                Enlist alongside <strong>{inviteInfo.officerRank} {inviteInfo.commanderName}</strong>{' '}
                (Code <strong className="font-mono">{inviteInfo.referralCode}</strong>). Receive{' '}
                <strong className="font-mono">500 $ODY</strong> &amp;{' '}
                <strong className="font-mono">5 Sortie Tickets</strong> immediately upon launch.
              </>
            ) : (
              <>
                Deploy into the OdyStorm sector with <strong className="font-mono">500 $ODY</strong>{' '}
                and <strong className="font-mono">5 Sortie Tickets</strong> ready for action.
              </>
            )}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              id="btn-invite-guest"
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleGuestJoin}
              disabled={launchingGuest}
            >
              <Play size={18} />
              {launchingGuest ? 'Deploying Pod...' : 'Accept & Play as Guest'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>Or create a permanent pilot account right away on the terminal →</span>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title" style={{ marginBottom: '12px' }}>
            Enlist Permanent Pilot Account
          </h2>
          <AuthForm initialTab="signup" onSuccess={() => router.replace('/')} />
        </section>
      </div>
    </main>
  );
}
