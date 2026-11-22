'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Send, Plus, Trash2, Search, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';

interface AdminMetrics {
  users: {
    total: number;
    registered: number;
    guests: number;
    activeToday: number;
    pushSubscribers: number;
  };
  economy: {
    circulatingSupply: number;
    totalMined: number;
    totalTicketsHeld: number;
    combatOdyAwarded: number;
  };
  activity: {
    totalMiningSessions: number;
    activeMiningSessions: number;
    completedSpaceDefenseRuns: number;
    highestSpaceDefenseScore: number;
  };
}

interface AdminTaskRow {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  taskType: 'milestone' | 'social_following' | 'combat';
  requirement: {
    mineTotal?: number;
    url?: string;
    minWave?: number;
    minScore?: number;
  };
  isActive: boolean;
  claimCount: number;
}

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isAnonymous: boolean;
  role: 'player' | 'admin';
  referralCode: string | null;
  balance: number;
  tickets: number;
  totalMined: number;
  shipLevel: number;
  bestScore: number;
  officerRank: string;
}

export default function AdminPage() {
  const { player, pushToast } = usePlayer();
  const [tab, setTab] = useState<'overview' | 'broadcast' | 'tasks' | 'users'>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [tasks, setTasks] = useState<AdminTaskRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userQuery, setUserQuery] = useState('');

  // Broadcast form
  const [bcTitle, setBcTitle] = useState('');
  const [bcBody, setBcBody] = useState('');
  const [bcMediaUrl, setBcMediaUrl] = useState('');
  const [bcMediaType, setBcMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [bcPush, setBcPush] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Task creation form
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tReward, setTReward] = useState('15000');
  const [tType, setTType] = useState<'social_following' | 'milestone' | 'combat'>('social_following');
  const [tTargetValue, setTTargetValue] = useState('');

  const loadOverview = useCallback(async () => {
    const m = await apiFetch<AdminMetrics>('/api/admin/metrics');
    setMetrics(m);
  }, []);

  const loadTasks = useCallback(async () => {
    const res = await apiFetch<{ tasks: AdminTaskRow[] }>('/api/admin/tasks');
    setTasks(res.tasks);
  }, []);

  const loadUsers = useCallback(async (q: string = '') => {
    const res = await apiFetch<{ users: AdminUserRow[] }>(
      `/api/admin/users?q=${encodeURIComponent(q)}`
    );
    setUsers(res.users);
  }, []);

  useEffect(() => {
    if (player?.user.role !== 'admin') return;
    void loadOverview();
    void loadTasks();
    void loadUsers('');
  }, [player?.user.role, loadOverview, loadTasks, loadUsers]);

  if (!player || player.user.role !== 'admin') {
    return (
      <section className="panel">
        <h1 className="panel-title">Restricted Sector</h1>
        <p className="panel-subtitle">Fleet Command Admin clearance is required.</p>
      </section>
    );
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<{ pushDelivered: number }>('/api/admin/broadcast', {
        method: 'POST',
        body: {
          title: bcTitle,
          body: bcBody,
          mediaUrl: bcMediaUrl,
          mediaType: bcMediaUrl ? bcMediaType : 'none',
          sendWebPush: bcPush,
        },
      });
      pushToast(
        'Dispatch Broadcasted!',
        `Live announcement published (${res.pushDelivered} Web Push deliveries).`,
        'amber'
      );
      setBcTitle('');
      setBcBody('');
      setBcMediaUrl('');
      await loadOverview();
    } catch (err: unknown) {
      pushToast('Broadcast Failed', (err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const requirement =
        tType === 'social_following'
          ? { url: tTargetValue.trim() }
          : tType === 'milestone'
          ? { mineTotal: Number(tTargetValue) || 100_000 }
          : { minWave: Number(tTargetValue) || 5 };

      await apiFetch('/api/admin/tasks', {
        method: 'POST',
        body: {
          title: tTitle,
          description: tDesc,
          rewardAmount: Number(tReward) || 10_000,
          taskType: tType,
          icon: tType === 'combat' ? 'combat' : 'ody_logo',
          requirement,
          isActive: true,
        },
      });
      pushToast('Directive Created', `"${tTitle}" is now live in Mission Control.`, 'amber');
      setTTitle('');
      setTDesc('');
      setTTargetValue('');
      await loadTasks();
    } catch (err: unknown) {
      pushToast('Create Task Failed', (err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleTask(task: AdminTaskRow) {
    await apiFetch(`/api/admin/tasks/${task.id}`, {
      method: 'PATCH',
      body: { isActive: !task.isActive },
    });
    await loadTasks();
  }

  async function handleDeleteTask(id: string) {
    await apiFetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
    pushToast('Directive Removed');
  }

  async function handleQuickGrant(
    u: AdminUserRow,
    patch: { balanceDelta?: number; ticketsDelta?: number; role?: 'player' | 'admin' }
  ) {
    try {
      await apiFetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: patch,
      });
      pushToast('Pilot Updated', `Applied adjustment to ${u.username || u.name}.`);
      await loadUsers(userQuery);
      await loadOverview();
    } catch (err: unknown) {
      pushToast('Update Failed', (err as Error).message, 'error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-eyebrow">High Command Console</div>
          <h1 className="page-title">OdyStorm Admin Operations</h1>
          <p className="page-desc">
            Monitor live economy telemetry, broadcast multimedia dispatches, manage Mission Control
            directives, and administer pilot accounts.
          </p>
        </div>

        <div className="tab-bar">
          {(
            [
              ['overview', 'Metrics'],
              ['broadcast', 'Broadcast'],
              ['tasks', 'Task Manager'],
              ['users', 'Pilots'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`tab-btn ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'overview' && metrics && (
        <>
          <div className="grid-4">
            <div className="stat-tile">
              <span className="stat-label">Total Pilots</span>
              <span className="stat-value">{metrics.users.total.toLocaleString()}</span>
              <span className="stat-meta">
                {metrics.users.registered} Registered · {metrics.users.guests} Guests
              </span>
            </div>

            <div className="stat-tile">
              <span className="stat-label">Circulating $ODY</span>
              <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {metrics.economy.circulatingSupply.toLocaleString()}
              </span>
              <span className="stat-meta">
                {metrics.economy.totalMined.toLocaleString()} Lifetime Extracted
              </span>
            </div>

            <div className="stat-tile">
              <span className="stat-label">Mining Cycles</span>
              <span className="stat-value">
                {metrics.activity.totalMiningSessions.toLocaleString()}
              </span>
              <span className="stat-meta">
                {metrics.activity.activeMiningSessions} Currently Active
              </span>
            </div>

            <div className="stat-tile">
              <span className="stat-label">Space Defense Sorties</span>
              <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
                {metrics.activity.completedSpaceDefenseRuns.toLocaleString()}
              </span>
              <span className="stat-meta">
                High Score: {metrics.activity.highestSpaceDefenseScore.toLocaleString()} pts
              </span>
            </div>
          </div>
        </>
      )}

      {tab === 'broadcast' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Publish Fleet Announcement</h2>
              <p className="panel-subtitle">
                Pushes instantly to all online Command Decks and opt-in Browser Web Push subscribers.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleBroadcast}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}
          >
            <div className="field">
              <label htmlFor="bc-title" className="field-label">
                Headline
              </label>
              <input
                id="bc-title"
                type="text"
                className="input"
                placeholder="Sector Weekend 2x Sortie Event"
                value={bcTitle}
                onChange={(e) => setBcTitle(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="bc-body" className="field-label">
                Transmission Body
              </label>
              <textarea
                id="bc-body"
                className="textarea"
                placeholder="Enter announcement details..."
                value={bcBody}
                onChange={(e) => setBcBody(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="bc-media-url" className="field-label">
                  Optional Media URL
                </label>
                <input
                  id="bc-media-url"
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={bcMediaUrl}
                  onChange={(e) => setBcMediaUrl(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="bc-media-type" className="field-label">
                  Media Format
                </label>
                <select
                  id="bc-media-type"
                  className="select"
                  value={bcMediaType}
                  onChange={(e) => setBcMediaType(e.target.value as 'none' | 'image' | 'video')}
                >
                  <option value="none">None</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={bcPush}
                onChange={(e) => setBcPush(e.target.checked)}
              />
              <span>Also send Browser Web Push notification to subscribed devices</span>
            </label>

            <div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Send size={15} />
                {submitting ? 'Transmitting...' : 'Broadcast Dispatch'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'tasks' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="panel">
            <h2 className="panel-title" style={{ marginBottom: '14px' }}>
              Create New Directive
            </h2>
            <form
              onSubmit={handleCreateTask}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div className="field">
                <label className="field-label">Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Join Official OdyStorm Discord"
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Connect with fellow wingmen"
                  value={tDesc}
                  onChange={(e) => setTDesc(e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div className="field">
                  <label className="field-label">Directive Type</label>
                  <select
                    className="select"
                    value={tType}
                    onChange={(e) =>
                      setTType(e.target.value as 'social_following' | 'milestone' | 'combat')
                    }
                  >
                    <option value="social_following">Community Link</option>
                    <option value="milestone">Mining Milestone</option>
                    <option value="combat">Combat Wave Target</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Reward ($ODY)</label>
                  <input
                    type="number"
                    className="input font-mono"
                    value={tReward}
                    onChange={(e) => setTReward(e.target.value)}
                    min={50}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">
                  {tType === 'social_following'
                    ? 'Target URL (https://...)'
                    : tType === 'milestone'
                    ? 'Required Lifetime $ODY Mined'
                    : 'Required Space Defense Wave'}
                </label>
                <input
                  type={tType === 'social_following' ? 'url' : 'number'}
                  className="input"
                  placeholder={
                    tType === 'social_following'
                      ? 'https://discord.gg/odystorm'
                      : tType === 'milestone'
                      ? '150000'
                      : '5'
                  }
                  value={tTargetValue}
                  onChange={(e) => setTTargetValue(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Plus size={16} />
                Add Directive
              </button>
            </form>
          </section>

          <section className="panel">
            <h2 className="panel-title" style={{ marginBottom: '14px' }}>
              Active Directives ({tasks.length})
            </h2>
            <div className="data-list">
              {tasks.map((t) => (
                <div key={t.id} className="data-row">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.title}</div>
                    <div className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      +{t.rewardAmount.toLocaleString()} $ODY · {t.claimCount} claims
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleToggleTask(t)}
                    >
                      {t.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteTask(t.id)}
                      aria-label={`Delete ${t.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'users' && (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Pilot Roster Management</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void loadUsers(userQuery);
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                type="text"
                className="input"
                placeholder="Search callsign, email, or code..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">
                <Search size={15} />
              </button>
            </form>
          </div>

          <div className="data-list">
            {users.map((u) => (
              <div key={u.id} className="data-row" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700 }}>{u.username || u.name}</span>
                    {u.role === 'admin' && (
                      <span className="status-tag amber">
                        <ShieldCheck size={12} /> Admin
                      </span>
                    )}
                    {u.isAnonymous && <span className="status-tag muted">Guest</span>}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {u.email} · {u.balance.toLocaleString()} $ODY · {u.tickets} Tickets · Lv.{u.shipLevel}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickGrant(u, { balanceDelta: 10_000 })}
                  >
                    +10k $ODY
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickGrant(u, { ticketsDelta: 5 })}
                  >
                    +5 Tickets
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      handleQuickGrant(u, {
                        role: u.role === 'admin' ? 'player' : 'admin',
                      })
                    }
                  >
                    {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
