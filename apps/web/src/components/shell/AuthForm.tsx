'use client';

import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { usePlayer } from '@/context/PlayerContext';
import { ShieldCheck, Rocket, Mail, Lock, User } from 'lucide-react';

interface AuthFormProps {
  initialTab?: 'signin' | 'signup';
  isUpgrade?: boolean;
  onSuccess?: () => void;
}

export function AuthForm({
  initialTab = 'signup',
  isUpgrade = false,
  onSuccess,
}: AuthFormProps) {
  const { enabledSocialProviders, refreshPlayer, pushToast } = usePlayer();
  const [tab, setTab] = useState<'signin' | 'signup'>(isUpgrade ? 'signup' : initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (tab === 'signup') {
        const { error } = await authClient.signUp.email({
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(error.message || 'Unable to create account.');
          return;
        }
        await refreshPlayer();
        pushToast(
          isUpgrade ? 'Command Account Bound!' : 'Welcome Aboard, Defender!',
          isUpgrade
            ? 'Your guest wallet, hangar upgrades, and mining progress are permanently secured.'
            : 'Your OdyStorm Command Deck is online.',
          'amber'
        );
        onSuccess?.();
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(error.message || 'Invalid email or password.');
          return;
        }
        await refreshPlayer();
        pushToast('Telemetry Restored', 'Welcome back to the Command Deck.');
        onSuccess?.();
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSocial(provider: 'google' | 'discord' | 'twitter') {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: '/',
      });
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Social sign-in unavailable.');
      setSubmitting(false);
    }
  }

  return (
    <div>
      {!isUpgrade && (
        <div className="tab-bar" style={{ width: '100%', marginBottom: '18px' }}>
          <button
            type="button"
            id="tab-auth-signup"
            className={`tab-btn ${tab === 'signup' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
          >
            Enlist Account
          </button>
          <button
            type="button"
            id="tab-auth-signin"
            className={`tab-btn ${tab === 'signin' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
          >
            Pilot Sign In
          </button>
        </div>
      )}

      {isUpgrade && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-cyan-soft)',
            marginBottom: '16px',
            fontSize: '0.84rem',
            color: 'var(--text-primary)',
          }}
        >
          <ShieldCheck size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <span>
            Binding an email &amp; password permanently locks in your current{' '}
            <strong className="font-mono">$ODY</strong> balance, upgrades, and squad referrals.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {tab === 'signup' && (
          <div className="field">
            <label htmlFor="auth-name" className="field-label">
              Pilot Callsign
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="auth-name"
                type="text"
                className="input"
                style={{ paddingLeft: '36px' }}
                placeholder="Commander Vega"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={40}
              />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="auth-email" className="field-label">
            Fleet Email
          </label>
          <div style={{ position: 'relative' }}>
            <Mail
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              id="auth-email"
              type="email"
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="pilot@odystorm.xyz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="auth-password" className="field-label">
            Access Passcode
          </label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              id="auth-password"
              type="password"
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-crimson-soft)',
              color: 'var(--accent-crimson)',
              fontSize: '0.84rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          id="btn-auth-submit"
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting}
        >
          <Rocket size={16} />
          {submitting
            ? 'Establishing Link...'
            : isUpgrade
            ? 'Bind Permanent Account'
            : tab === 'signup'
            ? 'Create Pilot Account'
            : 'Enter Command Deck'}
        </button>
      </form>

      {enabledSocialProviders.length > 0 && (
        <div style={{ marginTop: '18px' }}>
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
            }}
          >
            Or Connect Via Comms Relay
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {enabledSocialProviders.includes('google') && (
              <button
                type="button"
                id="btn-oauth-google"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => handleSocial('google')}
                disabled={submitting}
              >
                Google
              </button>
            )}
            {enabledSocialProviders.includes('discord') && (
              <button
                type="button"
                id="btn-oauth-discord"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => handleSocial('discord')}
                disabled={submitting}
              >
                Discord
              </button>
            )}
            {enabledSocialProviders.includes('twitter') && (
              <button
                type="button"
                id="btn-oauth-twitter"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => handleSocial('twitter')}
                disabled={submitting}
              >
                X
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
