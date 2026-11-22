'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Share2, Users, Link2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';

interface SquadMember {
  id: string;
  userId: string;
  callsign: string;
  isAnonymous: boolean;
  balance: number;
  totalMined: number;
  shipLevel: number;
  officerRank: string;
  signupBonusAwarded: number;
  totalCommissionEarned: number;
  joinedAt: number;
}

interface ReferralSummary {
  referralCode: string;
  referredByCommander: string | null;
  totalSquadMembers: number;
  totalBonusEarned: number;
  squad: SquadMember[];
}

export default function SquadPage() {
  const { player, refreshPlayer, pushToast } = usePlayer();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [applying, setApplying] = useState(false);

  const loadSquad = useCallback(async () => {
    try {
      const res = await apiFetch<ReferralSummary>('/api/referrals');
      setData(res);
    } catch (err: unknown) {
      pushToast('Unable to load squadron', (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadSquad();
  }, [loadSquad]);

  if (!player) return null;

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/invite/${player.user.referralCode}`
      : `/invite/${player.user.referralCode}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      pushToast('Invite Link Copied', inviteUrl);
    } catch {
      pushToast('Copy Failed', 'Select and copy the URL manually.', 'error');
    }
  }

  async function handleWebShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join my OdyStorm Space Defense Squadron',
          text: 'Enlist in OdyStorm Space Defense — mine $ODY, upgrade starships, and fly orbital defense sorties!',
          url: inviteUrl,
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      await handleCopy();
    }
  }

  async function handleManualApply(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setApplying(true);
    try {
      const res = await apiFetch<{ applied: boolean; referrerName?: string }>(
        '/api/player/referral/apply',
        {
          method: 'POST',
          body: { referralCode: manualCode.trim() },
        }
      );
      if (res.applied) {
        pushToast('Commander Linked!', `Joined ${res.referrerName}'s squadron.`, 'amber');
        setManualCode('');
        await refreshPlayer();
        await loadSquad();
      }
    } catch (err: unknown) {
      pushToast('Code Rejected', (err as Error).message, 'error');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-eyebrow">Fleet Recruitment</div>
          <h1 className="page-title">Squadron &amp; Referral Network</h1>
          <p className="page-desc">
            Recruit fellow pilots to earn <strong className="font-mono">5,000 $ODY</strong> per
            verified wingman plus a permanent <strong className="font-mono">10%</strong> commission
            on every mining cycle they claim.
          </p>
        </div>
      </header>

      <div className="grid-3">
        <div className="stat-tile">
          <span className="stat-label">Your Invite Code</span>
          <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {player.user.referralCode}
          </span>
          <span className="stat-meta">Shareable across any browser</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Active Wingmen</span>
          <span className="stat-value">{data?.totalSquadMembers ?? 0}</span>
          <span className="stat-meta">Enlisted pilots in your squad</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Squadron Yield Earned</span>
          <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
            {(data?.totalBonusEarned ?? 0).toLocaleString()} $ODY
          </span>
          <span className="stat-meta">Signup grants + 10% mining splits</span>
        </div>
      </div>

      {/* Share Link Panel */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Dispatch Recruitment Link</h2>
            <p className="panel-subtitle">
              Anyone opening your link automatically pairs with your squadron on enlistment.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            readOnly
            className="input font-mono"
            style={{ flex: '1 1 300px', fontSize: '0.88rem' }}
            value={inviteUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button id="btn-copy-invite" type="button" className="btn btn-primary" onClick={handleCopy}>
            <Copy size={16} />
            Copy Link
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleWebShare}>
            <Share2 size={16} />
            Share
          </button>
        </div>

        {!data?.referredByCommander && (
          <form
            onSubmit={handleManualApply}
            style={{
              marginTop: '18px',
              paddingTop: '18px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div className="field" style={{ flex: '1 1 220px' }}>
              <label htmlFor="manual-ref-code" className="field-label">
                Have a Commander&apos;s Invite Code?
              </label>
              <input
                id="manual-ref-code"
                type="text"
                className="input font-mono"
                placeholder="e.g. ODY7X9K2"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={applying || !manualCode.trim()}
            >
              <Link2 size={15} />
              {applying ? 'Linking...' : 'Link Commander'}
            </button>
          </form>
        )}

        {data?.referredByCommander && (
          <p style={{ marginTop: '14px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Assigned Squadron Commander: <strong>{data.referredByCommander}</strong>
          </p>
        )}
      </section>

      {/* Squad Roster */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Recruited Wingmen Roster</h2>
            <p className="panel-subtitle">
              Guest recruits unlock the 5,000 $ODY enlistment bounty as soon as they bind an account
              or claim their first mining cycle.
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Scanning squadron transponders...</p>
        ) : !data || data.squad.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Users size={28} style={{ color: 'var(--text-muted)' }} />
            <p>No pilots have joined your squadron yet. Share your recruitment link above!</p>
          </div>
        ) : (
          <div className="data-list">
            {data.squad.map((m) => (
              <div key={m.id} className="data-row" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700 }}>{m.callsign}</span>
                    <span className="status-tag cyan">
                      {m.officerRank} · Lv.{m.shipLevel}
                    </span>
                    {m.isAnonymous && <span className="status-tag muted">Guest Pod</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Mined: {m.totalMined.toLocaleString()} $ODY
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>
                    +{(m.signupBonusAwarded + m.totalCommissionEarned).toLocaleString()} $ODY
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                     Contributed to you
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
