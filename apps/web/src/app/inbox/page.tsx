'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, Radio, ScrollText } from 'lucide-react';
import { apiFetch, urlBase64ToUint8Array } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: number;
}

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaType: 'none' | 'image' | 'video';
  createdAt: number;
}

interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: number;
}

export default function InboxPage() {
  const { refreshPlayer, pushToast } = usePlayer();
  const [tab, setTab] = useState<'alerts' | 'dispatches' | 'ledger'>('alerts');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [vapidPublicKey, setVapidPublicKey] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInbox = useCallback(async () => {
    try {
      const [inboxRes, ledgerRes] = await Promise.all([
        apiFetch<{
          notifications: NotificationItem[];
          announcements: AnnouncementItem[];
          vapidPublicKey: string;
          pushEnabled: boolean;
        }>('/api/notifications'),
        apiFetch<{ entries: LedgerEntry[] }>('/api/player/ledger'),
      ]);
      setNotifications(inboxRes.notifications);
      setAnnouncements(inboxRes.announcements);
      setVapidPublicKey(inboxRes.vapidPublicKey);
      setPushEnabled(inboxRes.pushEnabled);
      setLedger(ledgerRes.entries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  async function handleMarkAllRead() {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await refreshPlayer();
  }

  async function handleToggleWebPush() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      pushToast('Push Unsupported', 'Browser Web Push is not available in this browser.', 'error');
      return;
    }

    setPushBusy(true);
    try {
      if (pushEnabled) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await apiFetch('/api/notifications/push/unsubscribe', { method: 'DELETE' });
        setPushEnabled(false);
        pushToast('Web Push Disabled', 'Background browser alerts paused.');
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          pushToast('Permission Denied', 'Allow browser notifications to receive reactor alerts.', 'error');
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
        await apiFetch('/api/notifications/push/subscribe', {
          method: 'POST',
          body: sub.toJSON(),
        });
        setPushEnabled(true);
        pushToast('Web Push Armed!', 'You will be notified when mining cycles complete.', 'amber');
      }
    } catch (err: unknown) {
      pushToast('Push Configuration Error', (err as Error).message, 'error');
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-eyebrow">Subspace Relay</div>
          <h1 className="page-title">Comms Inbox &amp; Vault Ledger</h1>
          <p className="page-desc">
            Review reactor extraction alerts, official fleet broadcasts, and auditable{' '}
            <span className="font-mono">$ODY</span> transactions.
          </p>
        </div>

        <button
          id="btn-toggle-webpush"
          type="button"
          className={`btn ${pushEnabled ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          onClick={handleToggleWebPush}
          disabled={pushBusy}
        >
          {pushEnabled ? <BellOff size={15} /> : <Bell size={15} />}
          {pushBusy
            ? 'Updating...'
            : pushEnabled
            ? 'Disable Browser Push'
            : 'Enable Browser Push Alerts'}
        </button>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn ${tab === 'alerts' ? 'active' : ''}`}
            onClick={() => setTab('alerts')}
          >
            <Bell size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} />
            Personal Alerts ({notifications.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'dispatches' ? 'active' : ''}`}
            onClick={() => setTab('dispatches')}
          >
            <Radio size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} />
            Fleet Dispatches ({announcements.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'ledger' ? 'active' : ''}`}
            onClick={() => setTab('ledger')}
          >
            <ScrollText size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} />
            Vault Ledger
          </button>
        </div>

        {tab === 'alerts' && notifications.some((n) => !n.isRead) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
            <CheckCheck size={15} />
            Mark All Read
          </button>
        )}
      </div>

      <section className="panel">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Decrypting transmissions...</p>
        ) : tab === 'alerts' ? (
          notifications.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No personal alerts yet.</p>
          ) : (
            <div className="data-list">
              {notifications.map((n) => (
                <div key={n.id} className="data-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!n.isRead && <span className="status-tag cyan">New</span>}
                      <span style={{ fontWeight: 700 }}>{n.title}</span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {n.body}
                    </p>
                  </div>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : tab === 'dispatches' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {announcements.map((a) => (
              <article
                key={a.id}
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem' }}>{a.title}</h3>
                  <span className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: '0.92rem' }}>
                  {a.body}
                </p>
                {a.mediaUrl && a.mediaType === 'image' && (
                  <img
                    src={a.mediaUrl}
                    alt={a.title}
                    style={{
                      marginTop: '14px',
                      maxWidth: '100%',
                      maxHeight: '340px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                )}
                {a.mediaUrl && a.mediaType === 'video' && (
                  <video
                    src={a.mediaUrl}
                    controls
                    style={{
                      marginTop: '14px',
                      maxWidth: '100%',
                      maxHeight: '340px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="data-list">
            {ledger.map((entry) => (
              <div key={entry.id} className="data-row">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{entry.description}</div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(entry.createdAt).toLocaleString()} · Balance After:{' '}
                    {entry.balanceAfter.toLocaleString()} $ODY
                  </div>
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontWeight: 700,
                    color:
                      entry.amount >= 0 ? 'var(--accent-emerald)' : 'var(--accent-crimson)',
                  }}
                >
                  {entry.amount >= 0 ? '+' : ''}
                  {entry.amount.toLocaleString()} $ODY
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
