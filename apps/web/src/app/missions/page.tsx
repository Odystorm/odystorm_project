'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Crosshair, Award, Clock } from 'lucide-react';
import { apiFetch, type PlayerSnapshot } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';

interface MissionItem {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  taskType: 'milestone' | 'social_following' | 'combat';
  icon: string;
  requirement: {
    mineTotal?: number;
    url?: string;
    minWave?: number;
    minScore?: number;
  };
  state: 'action_required' | 'verifying' | 'claimable' | 'locked' | 'claimed';
  progressCurrent: number;
  progressTarget: number;
  cooldownRemainingMs: number;
}

type FilterTab = 'all' | 'combat' | 'social_following' | 'milestone';

export default function MissionsPage() {
  const { setPlayerSnapshot, pushToast } = usePlayer();
  const [tasks, setTasks] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const res = await apiFetch<{ tasks: MissionItem[] }>('/api/tasks');
      setTasks(res.tasks);
    } catch (err: unknown) {
      pushToast('Failed to load missions', (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Tick down active 15-second social verification timers smoothly on client
  useEffect(() => {
    const hasVerifying = tasks.some((t) => t.state === 'verifying');
    if (!hasVerifying) return;

    const timer = setInterval(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.state !== 'verifying') return t;
          const nextRemaining = Math.max(0, t.cooldownRemainingMs - 1000);
          return {
            ...t,
            cooldownRemainingMs: nextRemaining,
            state: nextRemaining === 0 ? 'claimable' : 'verifying',
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [tasks]);

  async function handleStartSocial(task: MissionItem) {
    setBusyId(task.id);
    if (task.requirement.url) {
      window.open(task.requirement.url, '_blank', 'noopener,noreferrer');
    }
    try {
      const res = await apiFetch<{ verifyCooldownMs: number }>('/api/tasks/social-click', {
        method: 'POST',
        body: { taskId: task.id },
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, state: 'verifying', cooldownRemainingMs: res.verifyCooldownMs }
            : t
        )
      );
      pushToast('Comms Relay Opened', 'Verification completes in 15 seconds.');
    } catch (err: unknown) {
      pushToast('Action Failed', (err as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleClaim(task: MissionItem) {
    setBusyId(task.id);
    try {
      const res = await apiFetch<{
        rewardAmount: number;
        title: string;
        snapshot: PlayerSnapshot;
      }>('/api/tasks/claim', {
        method: 'POST',
        body: { taskId: task.id },
      });
      setPlayerSnapshot(res.snapshot);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, state: 'claimed' } : t))
      );
      pushToast(
        'Directive Completed!',
        `+${res.rewardAmount.toLocaleString()} $ODY credited for "${res.title}".`,
        'amber'
      );
    } catch (err: unknown) {
      pushToast('Claim Failed', (err as Error).message, 'error');
      void loadTasks();
    } finally {
      setBusyId(null);
    }
  }

  const visibleTasks = tasks.filter((t) =>
    filter === 'all' ? true : t.taskType === filter
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-eyebrow">Fleet Directives</div>
          <h1 className="page-title">OdyStorm Mission Control</h1>
          <p className="page-desc">
            Complete combat sorties, community dispatches, and lifetime extraction milestones
            for immediate <span className="font-mono">$ODY</span> bounties.
          </p>
        </div>

        <div className="tab-bar">
          {(
            [
              ['all', 'All'],
              ['combat', 'Combat'],
              ['social_following', 'Community'],
              ['milestone', 'Milestones'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`tab-btn ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <section className="panel">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading mission manifest...</p>
        ) : visibleTasks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No directives in this category.</p>
        ) : (
          <div className="data-list">
            {visibleTasks.map((task) => {
              const pct =
                task.progressTarget > 0
                  ? Math.min(100, (task.progressCurrent / task.progressTarget) * 100)
                  : 0;

              return (
                <div
                  key={task.id}
                  className="data-row"
                  style={{ flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className={`status-tag ${
                          task.taskType === 'combat'
                            ? 'amber'
                            : task.taskType === 'social_following'
                            ? 'cyan'
                            : 'emerald'
                        }`}
                      >
                        {task.taskType === 'combat' ? (
                          <>
                            <Crosshair size={12} /> Combat
                          </>
                        ) : task.taskType === 'social_following' ? (
                          'Comms'
                        ) : (
                          <>
                            <Award size={12} /> Milestone
                          </>
                        )}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                        {task.title}
                      </span>
                    </div>

                    {task.description && (
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        {task.description}
                      </p>
                    )}

                    {(task.taskType === 'milestone' || task.taskType === 'combat') &&
                      task.state !== 'claimed' && (
                        <div style={{ maxWidth: '340px', marginTop: '4px' }}>
                          <div className="progress-track" style={{ height: '7px' }}>
                            <div
                              className="progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div
                            className="font-mono"
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted)',
                              marginTop: '3px',
                            }}
                          >
                            {task.progressCurrent.toLocaleString()} /{' '}
                            {task.progressTarget.toLocaleString()}
                          </div>
                        </div>
                      )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      className="font-mono"
                      style={{
                        fontWeight: 700,
                        color: 'var(--accent-amber)',
                        fontSize: '0.95rem',
                      }}
                    >
                      +{task.rewardAmount.toLocaleString()} $ODY
                    </div>

                    {task.state === 'claimed' ? (
                      <span className="status-tag emerald" style={{ padding: '7px 12px' }}>
                        <CheckCircle2 size={14} /> Claimed
                      </span>
                    ) : task.state === 'action_required' ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === task.id}
                        onClick={() => handleStartSocial(task)}
                      >
                        Open Link <ExternalLink size={14} />
                      </button>
                    ) : task.state === 'verifying' ? (
                      <button type="button" className="btn btn-ghost btn-sm" disabled>
                        <Clock size={14} />
                        Verifying ({Math.ceil(task.cooldownRemainingMs / 1000)}s)
                      </button>
                    ) : task.state === 'claimable' ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === task.id}
                        onClick={() => handleClaim(task)}
                      >
                        {busyId === task.id ? 'Claiming...' : 'Claim Bounty'}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-ghost btn-sm" disabled>
                        Locked
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
