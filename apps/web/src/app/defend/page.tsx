'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ShipCombatStats } from '@odystorm/shared';
import { Crosshair, Play, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { apiFetch, type PlayerSnapshot } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';
import {
  SpaceDefenseGame,
  type RunTelemetryPayload,
} from '@/components/game/SpaceDefenseGame';

interface ActiveRunSession {
  runId: string;
  seed: string;
  isPractice: boolean;
  combatStats: ShipCombatStats;
}

interface CompletedRunSummary {
  runId: string;
  isPractice: boolean;
  waveReached: number;
  enemiesDestroyed: number;
  score: number;
  odyRewarded: number;
  isNewHighScore: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  callsign: string;
  shipLevel: number;
  officerRank: string;
  bestScore: number;
  bestWave: number;
}

export default function SpaceDefensePage() {
  const { player, setPlayerSnapshot, pushToast } = usePlayer();
  const [activeRun, setActiveRun] = useState<ActiveRunSession | null>(null);
  const [debrief, setDebrief] = useState<CompletedRunSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [lbTab, setLbTab] = useState<'allTime' | 'weekly'>('allTime');
  const [leaderboard, setLeaderboard] = useState<{
    allTime: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
  }>({ allTime: [], weekly: [] });

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await apiFetch<{
        allTime: LeaderboardEntry[];
        weekly: LeaderboardEntry[];
      }>('/api/game/leaderboard');
      setLeaderboard(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  if (!player) return null;

  async function handleStartRun(practice: boolean) {
    setStarting(true);
    setDebrief(null);
    try {
      const res = await apiFetch<{
        runId: string;
        seed: string;
        isPractice: boolean;
        remainingTickets: number;
        combatStats: ShipCombatStats;
      }>('/api/game/start', {
        method: 'POST',
        body: { practice },
      });

      setPlayerSnapshot({
        ...player!,
        wallet: {
          ...player!.wallet,
          tickets: res.remainingTickets,
        },
      });

      setActiveRun({
        runId: res.runId,
        seed: res.seed,
        isPractice: res.isPractice,
        combatStats: res.combatStats,
      });
    } catch (err: unknown) {
      pushToast('Sortie Launch Failed', (err as Error).message, 'error');
    } finally {
      setStarting(false);
    }
  }

  async function handleFinishRun(metrics: RunTelemetryPayload) {
    try {
      const res = await apiFetch<CompletedRunSummary & { snapshot: PlayerSnapshot }>(
        '/api/game/finish',
        {
          method: 'POST',
          body: metrics,
        }
      );
      setPlayerSnapshot(res.snapshot);
      setActiveRun(null);
      setDebrief(res);
      await loadLeaderboard();

      if (!res.isPractice && res.odyRewarded > 0) {
        pushToast(
          `Sortie Complete: +${res.odyRewarded.toLocaleString()} $ODY`,
          `Wave ${res.waveReached} · ${res.score.toLocaleString()} pts`,
          'amber'
        );
      }
    } catch (err: unknown) {
      setActiveRun(null);
      pushToast('Sortie Ended', (err as Error).message, 'cyan');
    }
  }

  if (activeRun) {
    return (
      <SpaceDefenseGame
        runId={activeRun.runId}
        isPractice={activeRun.isPractice}
        combatStats={activeRun.combatStats}
        onFinishRun={handleFinishRun}
      />
    );
  }

  const currentBoard = lbTab === 'allTime' ? leaderboard.allTime : leaderboard.weekly;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-eyebrow">Orbital Combat Arena</div>
          <h1 className="page-title">OdyStorm Space Defense</h1>
          <p className="page-desc">
            Deploy 1 Sortie Ticket to defend the orbital extraction lane against meteor storms,
            raider interceptors, and sector Dreadnoughts. Tickets replenish to 5 every UTC day.
          </p>
        </div>
      </header>

      {/* Post-Sortie Debrief Banner */}
      {debrief && (
        <section
          className="panel"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'hsla(216, 32%, 12%, 0.96)',
          }}
        >
          <div className="panel-header">
            <div>
              <div className="page-eyebrow">
                {debrief.isNewHighScore ? 'New Personal Record!' : 'Sortie Debrief'}
              </div>
              <h2 className="panel-title" style={{ fontSize: '1.3rem' }}>
                Wave {debrief.waveReached} Cleared · {debrief.score.toLocaleString()} Points
              </h2>
            </div>
            {!debrief.isPractice && (
              <span className="status-tag amber" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                <Sparkles size={15} /> +{debrief.odyRewarded.toLocaleString()} $ODY
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Hostiles Destroyed: <strong className="font-mono">{debrief.enemiesDestroyed}</strong>
            </span>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn btn-primary"
              disabled={starting || player.wallet.tickets < 1}
              onClick={() => handleStartRun(false)}
            >
              <RotateCcw size={15} />
              Launch Another Ranked Sortie ({player.wallet.tickets} left)
            </button>
          </div>
        </section>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Sortie Launch Briefing */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <img
              src="/images/ships/base_ship.webp"
              alt="Starship"
              style={{ width: '84px', height: '84px', objectFit: 'contain' }}
            />
            <div>
              <span className="status-tag cyan" style={{ marginBottom: '6px' }}>
                Lv.{player.progression.shipLevel} {player.user.officerRank}
              </span>
              <h2 style={{ fontSize: '1.25rem' }}>
                {player.progression.combatStats.weaponLabel}
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                {player.progression.combatStats.barrels}x Barrels ·{' '}
                {player.progression.combatStats.maxHull} Hull Cells ·{' '}
                {player.progression.combatStats.rewardMultiplier}x $ODY Multiplier
              </p>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="stat-tile" style={{ padding: '14px' }}>
              <span className="stat-label">Available Tickets</span>
              <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
                {player.wallet.tickets}
              </span>
              <span className="stat-meta">Refills to 5 daily at 00:00 UTC</span>
            </div>

            <div className="stat-tile" style={{ padding: '14px' }}>
              <span className="stat-label">Personal High Score</span>
              <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {player.progression.bestScore.toLocaleString()}
              </span>
              <span className="stat-meta">Best Sector: Wave {player.progression.bestWave || 1}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              id="btn-launch-sortie"
              type="button"
              className="btn btn-amber btn-lg btn-full"
              disabled={starting || player.wallet.tickets < 1}
              onClick={() => handleStartRun(false)}
            >
              <Crosshair size={18} />
              {starting
                ? 'Preparing Launch Tube...'
                : player.wallet.tickets > 0
                ? 'Launch Ranked Sortie (1 Ticket)'
                : 'No Sortie Tickets Remaining'}
            </button>

            <button
              id="btn-launch-practice"
              type="button"
              className="btn btn-secondary btn-full"
              disabled={starting}
              onClick={() => handleStartRun(true)}
            >
              <Play size={16} />
              Launch Free Practice Simulation (0 Tickets)
            </button>
          </div>
        </section>

        {/* Pilot Leaderboard */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <Trophy size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom', color: 'var(--accent-amber)' }} />
                Ace Pilot Leaderboard
              </h2>
              <p className="panel-subtitle">Ranked single-sortie combat scores.</p>
            </div>

            <div className="tab-bar">
              <button
                type="button"
                className={`tab-btn ${lbTab === 'allTime' ? 'active' : ''}`}
                onClick={() => setLbTab('allTime')}
              >
                All-Time
              </button>
              <button
                type="button"
                className={`tab-btn ${lbTab === 'weekly' ? 'active' : ''}`}
                onClick={() => setLbTab('weekly')}
              >
                7-Day
              </button>
            </div>
          </div>

          {currentBoard.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No ranked sorties logged in this window yet — launch now to set the pace!
            </p>
          ) : (
            <div className="data-list">
              {currentBoard.slice(0, 12).map((entry) => (
                <div key={entry.userId} className="data-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      className="font-mono"
                      style={{
                        width: '26px',
                        fontWeight: 700,
                        color: entry.rank <= 3 ? 'var(--accent-amber)' : 'var(--text-muted)',
                      }}
                    >
                      #{entry.rank}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                        {entry.callsign}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {entry.officerRank} · Wave {entry.bestWave}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {entry.bestScore.toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
