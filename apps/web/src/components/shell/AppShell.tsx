'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cpu,
  Crosshair,
  Target,
  Users,
  BarChart3,
  Bell,
  ShieldAlert,
  Ticket,
  Flame,
  LogOut,
  UserPlus,
  X,
  Play,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { usePlayer } from '@/context/PlayerContext';
import { AuthForm } from './AuthForm';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    player,
    loading,
    refreshPlayer,
    pushToast,
    authModalMode,
    setAuthModalMode,
    pendingInviteCode,
  } = usePlayer();
  const [launchingGuest, setLaunchingGuest] = useState(false);

  // Allow dedicated /invite/[code] route to render its custom invite landing when signed out
  const isInviteLanding = pathname?.startsWith('/invite/');

  async function handleLaunchGuest() {
    setLaunchingGuest(true);
    try {
      const { error } = await authClient.signIn.anonymous();
      if (error) {
        pushToast('Guest Launch Failed', error.message || 'Please try again.', 'error');
        return;
      }
      await refreshPlayer();
      pushToast(
        'Guest Command Deck Online',
        '500 $ODY & 5 Sortie Tickets loaded. Bind an account anytime to save permanently.'
      );
    } catch (err: unknown) {
      pushToast('Guest Launch Failed', (err as Error).message, 'error');
    } finally {
      setLaunchingGuest(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    await refreshPlayer();
    pushToast('Signed Out', 'Session closed safely.');
  }

  if (loading) {
    return (
      <>
        <div className="odystorm-backdrop" />
        <main
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
          }}
        >
          <img
            src="/images/logo/logo.svg"
            alt="OdyStorm Emblem"
            width={64}
            height={64}
          />
          <p className="font-display" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            INITIALIZING FLEET TELEMETRY...
          </p>
        </main>
      </>
    );
  }

  if (!player) {
    if (isInviteLanding) {
      return (
        <>
          <div className="odystorm-backdrop" />
          {children}
        </>
      );
    }

    return (
      <>
        <div className="odystorm-backdrop" />
        <main className="enlist-screen">
          <div className="enlist-grid">
            <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src="/images/logo/logo.svg"
                  alt="OdyStorm Logo"
                  width={56}
                  height={56}
                />
                <div>
                  <div className="page-eyebrow">OdyStorm Galaxy Defense Corp</div>
                  <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.85rem)' }}>
                    OdyStorm Space Defense
                  </h1>
                </div>
              </div>

              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '54ch' }}>
                Command an orbital <strong className="font-mono">$ODY</strong> extraction reactor,
                upgrade 15 tiers of starship weaponry and shields, and pilot live arcade defense
                sorties straight from your browser.
              </p>

              {pendingInviteCode && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-amber-soft)',
                    border: '1px solid hsla(38, 94%, 56%, 0.35)',
                    fontSize: '0.9rem',
                  }}
                >
                  Squadron Invite Code <strong className="font-mono">{pendingInviteCode}</strong>{' '}
                  detected — enlist below to link with your Commander.
                </div>
              )}

              <div className="grid-3" style={{ gap: '12px' }}>
                <div className="stat-tile" style={{ padding: '14px' }}>
                  <span className="stat-label">Enlistment Grant</span>
                  <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--accent-cyan)' }}>
                    500 $ODY
                  </span>
                  <span className="stat-meta">+ Daily Streak Bonuses</span>
                </div>
                <div className="stat-tile" style={{ padding: '14px' }}>
                  <span className="stat-label">Daily Sorties</span>
                  <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--accent-amber)' }}>
                    5 Tickets
                  </span>
                  <span className="stat-meta">2D Arcade Wave Shooter</span>
                </div>
                <div className="stat-tile" style={{ padding: '14px' }}>
                  <span className="stat-label">Squadron Yield</span>
                  <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--accent-emerald)' }}>
                    +10% Share
                  </span>
                  <span className="stat-meta">+ 5,000 $ODY Per Recruit</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <button
                  id="btn-play-guest"
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleLaunchGuest}
                  disabled={launchingGuest}
                >
                  <Play size={18} />
                  {launchingGuest ? 'Deploying Guest Pod...' : 'Play Instantly as Guest'}
                </button>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header" style={{ marginBottom: '14px' }}>
                <div>
                  <h2 className="panel-title">Pilot Access Terminal</h2>
                  <p className="panel-subtitle">
                    Enlist a permanent account or sign in to sync across devices.
                  </p>
                </div>
              </div>
              <AuthForm initialTab="signup" />
            </section>
          </div>
        </main>
      </>
    );
  }

  const navItems = [
    { href: '/', label: 'Reactor & Hangar', shortLabel: 'Reactor', icon: Cpu },
    {
      href: '/defend',
      label: 'Space Defense',
      shortLabel: 'Defend',
      icon: Crosshair,
      badge: player.wallet.tickets > 0 ? String(player.wallet.tickets) : undefined,
    },
    { href: '/missions', label: 'Mission Control', shortLabel: 'Missions', icon: Target },
    { href: '/squad', label: 'Squadron', shortLabel: 'Squad', icon: Users },
    { href: '/stats', label: 'Fleet Telemetry', shortLabel: 'Stats', icon: BarChart3 },
    {
      href: '/inbox',
      label: 'Comms Inbox',
      shortLabel: 'Inbox',
      icon: Bell,
      badge:
        player.unreadNotifications > 0 ? String(player.unreadNotifications) : undefined,
    },
  ];

  if (player.user.role === 'admin') {
    navItems.push({
      href: '/admin',
      label: 'Admin Command',
      shortLabel: 'Admin',
      icon: ShieldAlert,
    });
  }

  const mobileTabs = navItems.slice(0, 5);

  return (
    <>
      <div className="odystorm-backdrop" />
      <div className="deck-shell">
        {/* Desktop Sidebar */}
        <aside className="deck-sidebar" aria-label="Primary Fleet Navigation">
          <div>
            <Link href="/" className="sidebar-brand">
              <img src="/images/logo/logo.svg" alt="OdyStorm Logo" />
              <div>
                <div className="sidebar-brand-title">OdyStorm</div>
                <div className="sidebar-brand-sub">Command Deck</div>
              </div>
            </Link>

            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                  >
                    <span className="nav-item-left">
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ padding: '0 6px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                {player.user.username}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--accent-cyan)' }}>
                {player.user.officerRank} · Lv.{player.progression.shipLevel}
              </div>
            </div>

            {player.user.isAnonymous ? (
              <button
                id="btn-sidebar-bind-account"
                type="button"
                className="btn btn-primary btn-sm btn-full"
                onClick={() => setAuthModalMode('upgrade')}
              >
                <UserPlus size={14} />
                Bind Account
              </button>
            ) : (
              <button
                id="btn-sidebar-signout"
                type="button"
                className="btn btn-ghost btn-sm btn-full"
                onClick={handleSignOut}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            )}
          </div>
        </aside>

        {/* Main Column */}
        <div className="deck-main-col">
          <header className="deck-topbar">
            <Link href="/" className="mobile-brand">
              <img src="/images/logo/logo.svg" alt="OdyStorm" />
              <span className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                ODYSTORM
              </span>
            </Link>

            <div className="topbar-telemetry">
              <div className="telemetry-chip" title="Current $ODY Balance">
                <span className="telemetry-chip-label">$ODY</span>
                <span
                  className="telemetry-chip-value"
                  style={{ color: 'var(--accent-cyan)' }}
                >
                  {player.wallet.balance.toLocaleString()}
                </span>
              </div>

              <Link
                href="/defend"
                className="telemetry-chip"
                title="Available Space Defense Sortie Tickets"
              >
                <Ticket size={15} style={{ color: 'var(--accent-amber)' }} />
                <span className="telemetry-chip-value">{player.wallet.tickets}</span>
                <span className="telemetry-chip-label">Tickets</span>
              </Link>

              <div
                className="telemetry-chip"
                title="Consecutive Active Duty Days"
                style={{ display: 'inline-flex' }}
              >
                <Flame size={15} style={{ color: 'var(--accent-amber)' }} />
                <span className="telemetry-chip-value">
                  {player.progression.activeDaysStreak}d
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {player.user.isAnonymous && (
                <button
                  id="btn-topbar-bind-account"
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setAuthModalMode('upgrade')}
                >
                  <UserPlus size={14} />
                  <span>Save Progress</span>
                </button>
              )}

              <Link
                href="/inbox"
                className="btn btn-ghost btn-sm"
                title="Comms Inbox"
                style={{ position: 'relative' }}
              >
                <Bell size={16} />
                {player.unreadNotifications > 0 && (
                  <span className="nav-badge" style={{ marginLeft: '2px' }}>
                    {player.unreadNotifications}
                  </span>
                )}
              </Link>

              {player.user.role === 'admin' && (
                <Link href="/admin" className="btn btn-secondary btn-sm" title="Admin Console">
                  <ShieldAlert size={15} />
                </Link>
              )}
            </div>
          </header>

          <main className="deck-content">{children}</main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav" aria-label="Mobile Fleet Navigation">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-link ${active ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Guest -> Permanent Account Upgrade Modal */}
      {authModalMode && (
        <div
          className="modal-backdrop"
          onClick={() => setAuthModalMode(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h2 className="panel-title">
                {authModalMode === 'upgrade'
                  ? 'Secure Your Guest Progress'
                  : 'Pilot Authentication'}
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAuthModalMode(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>
            <AuthForm
              isUpgrade={authModalMode === 'upgrade'}
              initialTab={authModalMode === 'signin' ? 'signin' : 'signup'}
              onSuccess={() => setAuthModalMode(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
