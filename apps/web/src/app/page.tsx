'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  HANGAR_UPGRADES,
  calculateMiningReward,
  getShipCombatStats,
} from '@odystorm/shared';
import {
  Zap,
  Crosshair,
  Shield,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiFetch, type PlayerSnapshot } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function CommandDeckPage() {
  const { player, setPlayerSnapshot, pushToast } = usePlayer();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showFullTree, setShowFullTree] = useState(false);

  // Offset between server clock and local browser clock
  const serverOffsetMs = useMemo(() => {
    if (!player?.serverTime) return 0;
    return player.serverTime - Date.now();
  }, [player?.serverTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 250);
    return () => clearInterval(interval);
  }, [serverOffsetMs]);

  if (!player) return null;

  const session = player.activeMiningSession;
  const { progression, wallet, user } = player;

  let progressPct = 0;
  let accruedOdy = 0;
  let remainingMs = 0;
  let isClaimReady = false;

  if (session) {
    const totalMs = Math.max(1, session.endTime - session.startTime);
    const elapsedMs = Math.max(0, Math.min(totalMs, nowMs - session.startTime));
    progressPct = Math.min(100, (elapsedMs / totalMs) * 100);
    accruedOdy = Math.min(
      session.rewardAmount,
      Math.floor((elapsedMs / totalMs) * session.rewardAmount)
    );
    remainingMs = Math.max(0, session.endTime - nowMs);
    isClaimReady = session.isComplete || remainingMs <= 0;
  }

  const nextCyclePotential = calculateMiningReward(
    progression.energyHours,
    progression.shipLevel
  );

  async function handleStartMining() {
    setBusyAction('start');
    try {
      const updated = await apiFetch<PlayerSnapshot>('/api/mining/start', {
        method: 'POST',
      });
      setPlayerSnapshot(updated);
      pushToast(
        'Mining Reactor Ignited',
        `Extracting at +${updated.progression.shipLevel} $ODY/sec for ${updated.progression.energyHours}h.`
      );
    } catch (err: unknown) {
      pushToast('Reactor Error', (err as Error).message, 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleClaimMining() {
    setBusyAction('claim');
    try {
      const res = await apiFetch<{ claimedAmount: number; snapshot: PlayerSnapshot }>(
        '/api/mining/claim',
        { method: 'POST' }
      );
      setPlayerSnapshot(res.snapshot);
      pushToast(
        'Extraction Claimed!',
        `+${res.claimedAmount.toLocaleString()} $ODY transferred to your vault.`,
        'amber'
      );
    } catch (err: unknown) {
      pushToast('Claim Failed', (err as Error).message, 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePurchaseUpgrade(type: 'ship' | 'energy') {
    setBusyAction(`upgrade-${type}`);
    try {
      const res = await apiFetch<{
        upgraded: string;
        cost: number;
        snapshot: PlayerSnapshot;
      }>('/api/mining/upgrade', {
        method: 'POST',
        body: { type },
      });
      setPlayerSnapshot(res.snapshot);
      pushToast(
        `Installed ${res.upgraded}`,
        `-${res.cost.toLocaleString()} $ODY · Systems recalibrated.`,
        'amber'
      );
    } catch (err: unknown) {
      pushToast('Upgrade Unavailable', (err as Error).message, 'error');
    } finally {
      setBusyAction(null);
    }
  }

  const nextShip = progression.nextShipUpgrade;
  const nextEnergy = progression.nextEnergyUpgrade;
  const nextShipCombat = nextShip
    ? getShipCombatStats(nextShip.shipLevel, progression.energyHours)
    : null;
  const nextEnergyCombat = nextEnergy
    ? getShipCombatStats(progression.shipLevel, nextEnergy.farmPeriodHours)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="page-header" style={{ marginBottom: '4px' }}>
        <div>
          <div className="page-eyebrow">
            {user.officerRank} · Sector 01 Orbital Station
          </div>
          <h1 className="page-title">Welcome aboard, {user.username}</h1>
          <p className="page-desc">
            Manage orbital <span className="font-mono">$ODY</span> extraction, upgrade your
            vessel&apos;s reactor and weapon barrels, or launch into live Space Defense sorties.
          </p>
        </div>

        <Link id="btn-hero-defend" href="/defend" className="btn btn-amber btn-lg">
          <Crosshair size={18} />
          Play Space Defense ({wallet.tickets} Tickets)
        </Link>
      </header>

      {/* Top Overview Row: Reactor + Ship Combat Readiness */}
      <div className="grid-2">
        {/* Orbital Mining Reactor Card */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Orbital Mining Reactor</h2>
                <p className="panel-subtitle">
                  Rate: <strong className="font-mono">+{progression.shipLevel} $ODY/s</strong> ·
                  Cycle: <strong className="font-mono">{progression.energyHours}h</strong>
                </p>
              </div>
              <span
                className={`status-tag ${
                  !session
                    ? 'muted'
                    : isClaimReady
                    ? 'amber'
                    : 'cyan'
                }`}
              >
                {!session
                  ? 'Standby'
                  : isClaimReady
                  ? 'Yield Ready'
                  : 'Extracting'}
              </span>
            </div>

            <div
              style={{
                padding: '22px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div className="stat-label">
                    {session ? 'Current Cycle Yield' : 'Projected Cycle Output'}
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 'clamp(1.7rem, 3vw, 2.35rem)',
                      fontWeight: 700,
                      color: isClaimReady ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                    }}
                  >
                    {(session ? accruedOdy : nextCyclePotential).toLocaleString()} $ODY
                  </div>
                </div>

                {session && (
                  <div style={{ textAlign: 'right' }}>
                    <div className="stat-label">
                      {isClaimReady ? 'Cycle Complete' : 'Time Remaining'}
                    </div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                      {isClaimReady ? '00:00:00' : formatCountdown(remainingMs)}
                    </div>
                  </div>
                )}
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${isClaimReady ? 'amber' : ''}`}
                  style={{ width: `${session ? progressPct : 0}%` }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Vault Balance: {wallet.balance.toLocaleString()} $ODY</span>
                <span>Lifetime Extracted: {wallet.totalMined.toLocaleString()} $ODY</span>
              </div>
            </div>
          </div>

          <div>
            {!session ? (
              <button
                id="btn-start-mining"
                type="button"
                className="btn btn-primary btn-lg btn-full"
                onClick={handleStartMining}
                disabled={busyAction !== null}
              >
                <Zap size={18} />
                {busyAction === 'start'
                  ? 'Igniting Reactor...'
                  : `Start ${progression.energyHours}h Extraction (+${nextCyclePotential.toLocaleString()} $ODY)`}
              </button>
            ) : isClaimReady ? (
              <button
                id="btn-claim-mining"
                type="button"
                className="btn btn-amber btn-lg btn-full"
                onClick={handleClaimMining}
                disabled={busyAction !== null}
              >
                <Sparkles size={18} />
                {busyAction === 'claim'
                  ? 'Transferring Yield...'
                  : `Claim ${session.rewardAmount.toLocaleString()} $ODY`}
              </button>
            ) : (
              <button
                id="btn-mining-active"
                type="button"
                className="btn btn-secondary btn-lg btn-full"
                disabled
              >
                Extraction Active · {progressPct.toFixed(1)}% Complete
              </button>
            )}
          </div>
        </section>

        {/* Starship Loadout & Combat Sortie Card */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
          <div className="panel-header" style={{ marginBottom: 0 }}>
            <div>
              <h2 className="panel-title">Active Vessel Loadout</h2>
              <p className="panel-subtitle">
                Hangar upgrades directly scale Space Defense firepower and hull plating.
              </p>
            </div>
            <span className="status-tag emerald">Lv.{progression.shipLevel} Hull</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px minmax(0, 1fr)',
              gap: '20px',
              alignItems: 'center',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src="/images/ships/base_ship.webp"
                alt="OdyStorm Interceptor"
                style={{
                  width: '96px',
                  height: '96px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 18px rgba(14, 185, 235, 0.28))',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <div>
                <div className="stat-label">Weapon System</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {progression.combatStats.weaponLabel}
                </div>
                <div className="stat-meta font-mono">
                  {progression.combatStats.barrels}x Barrel · {progression.combatStats.projectileDamage} DMG
                </div>
              </div>

              <div>
                <div className="stat-label">Deflector Hull</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {progression.combatStats.maxHull} Integrity Cells
                </div>
                <div className="stat-meta font-mono">
                  {progression.combatStats.rewardMultiplier}x Sortie Yield
                </div>
              </div>

              <div>
                <div className="stat-label">Personal Best</div>
                <div className="font-mono" style={{ fontWeight: 700 }}>
                  {progression.bestScore.toLocaleString()} pts
                </div>
              </div>

              <div>
                <div className="stat-label">Furthest Sector</div>
                <div className="font-mono" style={{ fontWeight: 700 }}>
                  Wave {progression.bestWave || 1}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/defend" className="btn btn-secondary" style={{ flex: 1 }}>
              <Crosshair size={16} />
              Enter Combat Arena
            </Link>
            <Link href="/missions" className="btn btn-ghost" style={{ flex: 1 }}>
              View Combat Directives
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </div>

      {/* Hangar Upgrades Section */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Shipyard &amp; Reactor Upgrades</h2>
            <p className="panel-subtitle">
              Reinvest mined <span className="font-mono">$ODY</span> to permanently increase
              extraction rate, session duration, and Space Defense combat capability.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowFullTree((prev) => !prev)}
          >
            {showFullTree ? 'Hide Tech Roadmap' : 'All 15 Tiers'}
            {showFullTree ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        <div className="grid-2">
          {/* Mining Ship Upgrade */}
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="status-tag cyan">Ship Hull &amp; Cannons</span>
                <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Lv.{progression.shipLevel} / 16
                </span>
              </div>

              {nextShip ? (
                <>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>{nextShip.tool}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {nextShip.description}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.84rem' }}>
                    <div>
                      • Mining Rate:{' '}
                      <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                        +{progression.shipLevel}/s → +{nextShip.shipLevel}/s
                      </strong>
                    </div>
                    {nextShipCombat && (
                      <div>
                        • Combat Loadout:{' '}
                        <strong className="font-mono">
                          {nextShipCombat.weaponLabel} ({nextShipCombat.rewardMultiplier}x yield)
                        </strong>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald)' }} />
                  <span>Maximum Flagship Tier (Lv.16) Unlocked!</span>
                </div>
              )}
            </div>

            {nextShip && (
              <button
                id="btn-upgrade-ship"
                type="button"
                className="btn btn-primary btn-full"
                disabled={busyAction !== null || wallet.balance < nextShip.shipCost}
                onClick={() => handlePurchaseUpgrade('ship')}
              >
                <Zap size={16} />
                {busyAction === 'upgrade-ship'
                  ? 'Installing...'
                  : `Upgrade Ship · ${nextShip.shipCost.toLocaleString()} $ODY`}
              </button>
            )}
          </div>

          {/* Energy Core Upgrade */}
          <div
            style={{
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="status-tag amber">Energy Core &amp; Shields</span>
                <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {progression.energyHours}h / 9h
                </span>
              </div>

              {nextEnergy ? (
                <>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>
                    {nextEnergy.tool} Core
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Extends unattended orbital reactor shifts and reinforces deflector shields.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.84rem' }}>
                    <div>
                      • Cycle Duration:{' '}
                      <strong className="font-mono" style={{ color: 'var(--accent-amber)' }}>
                        {progression.energyHours}h → {nextEnergy.farmPeriodHours}h
                      </strong>
                    </div>
                    {nextEnergyCombat && (
                      <div>
                        • Deflector Integrity:{' '}
                        <strong className="font-mono">
                          {progression.combatStats.maxHull} → {nextEnergyCombat.maxHull} Hull Cells
                        </strong>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald)' }} />
                  <span>Maximum 9-Hour Energy Core Installed!</span>
                </div>
              )}
            </div>

            {nextEnergy && (
              <button
                id="btn-upgrade-energy"
                type="button"
                className="btn btn-secondary btn-full"
                disabled={busyAction !== null || wallet.balance < nextEnergy.energyCost}
                onClick={() => handlePurchaseUpgrade('energy')}
              >
                <Shield size={16} />
                {busyAction === 'upgrade-energy'
                  ? 'Installing...'
                  : `Upgrade Energy Core · ${nextEnergy.energyCost.toLocaleString()} $ODY`}
              </button>
            )}
          </div>
        </div>

        {showFullTree && (
          <div style={{ marginTop: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-strong)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Tier</th>
                  <th style={{ padding: '10px 8px' }}>Module</th>
                  <th style={{ padding: '10px 8px' }}>Rate</th>
                  <th style={{ padding: '10px 8px' }}>Ship Cost</th>
                  <th style={{ padding: '10px 8px' }}>Duration</th>
                  <th style={{ padding: '10px 8px' }}>Core Cost</th>
                </tr>
              </thead>
              <tbody>
                {HANGAR_UPGRADES.map((tier) => {
                  const shipOwned = progression.shipLevel >= tier.shipLevel;
                  const coreOwned = progression.energyHours >= tier.farmPeriodHours;
                  return (
                    <tr
                      key={tier.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <td className="font-mono" style={{ padding: '10px 8px' }}>
                        Lv.{tier.shipLevel}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{tier.tool}</td>
                      <td className="font-mono" style={{ padding: '10px 8px', color: shipOwned ? 'var(--accent-emerald)' : 'inherit' }}>
                        +{tier.shipLevel}/s {shipOwned ? '✓' : ''}
                      </td>
                      <td className="font-mono" style={{ padding: '10px 8px' }}>
                        {tier.shipCost.toLocaleString()} $ODY
                      </td>
                      <td className="font-mono" style={{ padding: '10px 8px', color: coreOwned ? 'var(--accent-emerald)' : 'inherit' }}>
                        {tier.farmPeriodHours}h {coreOwned ? '✓' : ''}
                      </td>
                      <td className="font-mono" style={{ padding: '10px 8px' }}>
                        {tier.energyCost.toLocaleString()} $ODY
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
