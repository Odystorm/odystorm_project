'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Pickaxe } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface FleetStatsResponse {
  totalMined: number;
  circulatingSupply: number;
  noOfMineSessions: number;
  totalSorties: number;
  armyTotal: number;
  reportedToday: number;
  topMiners: Array<{
    rank: number;
    userId: string;
    callsign: string;
    totalMined: number;
    balance: number;
    shipLevel: number;
    officerRank: string;
  }>;
}

interface LeaderboardResponse {
  allTime: Array<{
    rank: number;
    userId: string;
    callsign: string;
    shipLevel: number;
    officerRank: string;
    bestScore: number;
    bestWave: number;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<FleetStatsResponse | null>(null);
  const [pilots, setPilots] = useState<LeaderboardResponse['allTime']>([]);
  const [tab, setTab] = useState<'pilots' | 'miners'>('pilots');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<FleetStatsResponse>('/api/stats'),
      apiFetch<LeaderboardResponse>('/api/game/leaderboard'),
    ])
      .then(([s, lb]) => {
        setStats(s);
        setPilots(lb.allTime);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-eyebrow">Network Overview</div>
          <h1 className="page-title">OdyStorm Fleet Telemetry</h1>
          <p className="page-desc">
            Live sector-wide <span className="font-mono">$ODY</span> extraction metrics, active
            duty defenders, and fleet leaderboards.
          </p>
        </div>
      </header>

      <div className="grid-4">
        <div className="stat-tile">
          <span className="stat-label">Total $ODY Extracted</span>
          <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {loading ? '...' : (stats?.totalMined ?? 0).toLocaleString()}
          </span>
          <span className="stat-meta">Mining + Combat Sorties</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Completed Cycles</span>
          <span className="stat-value">
            {loading ? '...' : (stats?.noOfMineSessions ?? 0).toLocaleString()}
          </span>
          <span className="stat-meta">
            + {(stats?.totalSorties ?? 0).toLocaleString()} Defense Sorties
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">OdyStorm Fleet Total</span>
          <span className="stat-value">
            {loading ? '...' : (stats?.armyTotal ?? 0).toLocaleString()}
          </span>
          <span className="stat-meta">Enlisted Pilots</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Defenders Active Today</span>
          <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
            {loading ? '...' : (stats?.reportedToday ?? 0).toLocaleString()}
          </span>
          <span className="stat-meta">UTC Duty Check-Ins</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Sector Honor Roll</h2>
            <p className="panel-subtitle">
              Highest-scoring Space Defense aces and top lifetime $ODY extractors.
            </p>
          </div>

          <div className="tab-bar">
            <button
              type="button"
              className={`tab-btn ${tab === 'pilots' ? 'active' : ''}`}
              onClick={() => setTab('pilots')}
            >
              <Trophy size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} />
              Top Aces
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === 'miners' ? 'active' : ''}`}
              onClick={() => setTab('miners')}
            >
              <Pickaxe size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} />
              Top Miners
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Querying fleet records...</p>
        ) : tab === 'pilots' ? (
          pilots.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              No ranked Space Defense sorties recorded yet — launch a sortie to claim #1!
            </p>
          ) : (
            <div className="data-list">
              {pilots.map((p) => (
                <div key={p.userId} className="data-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      className="font-mono"
                      style={{
                        width: '28px',
                        fontWeight: 700,
                        color: p.rank <= 3 ? 'var(--accent-amber)' : 'var(--text-muted)',
                      }}
                    >
                      #{p.rank}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.callsign}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {p.officerRank} · Wave {p.bestWave}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {p.bestScore.toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="data-list">
            {(stats?.topMiners ?? []).map((m) => (
              <div key={m.userId} className="data-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    className="font-mono"
                    style={{
                      width: '28px',
                      fontWeight: 700,
                      color: m.rank <= 3 ? 'var(--accent-amber)' : 'var(--text-muted)',
                    }}
                  >
                    #{m.rank}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.callsign}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {m.officerRank} · Lv.{m.shipLevel}
                    </div>
                  </div>
                </div>
                <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>
                  {m.totalMined.toLocaleString()} $ODY
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
