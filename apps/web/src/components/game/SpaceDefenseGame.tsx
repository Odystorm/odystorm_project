'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SPACE_DEFENSE_CONFIG, type ShipCombatStats } from '@odystorm/shared';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Zap,
  Shield,
  LogOut,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';

export interface RunTelemetryPayload {
  runId: string;
  waveReached: number;
  asteroidsDestroyed: number;
  scoutsDestroyed: number;
  cruisersDestroyed: number;
  bossesDestroyed: number;
  shardsCollected: number;
}

interface SpaceDefenseGameProps {
  runId: string;
  isPractice: boolean;
  combatStats: ShipCombatStats;
  onFinishRun: (metrics: RunTelemetryPayload) => Promise<void>;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  friendly: boolean;
  color: string;
  radius: number;
}

type EnemyKind = 'asteroid' | 'scout' | 'cruiser' | 'boss';

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  rot: number;
  rotSpeed: number;
  shootTimer: number;
  phase: number;
}

type PickupKind = 'shard' | 'overdrive' | 'hull' | 'emp';

interface Pickup {
  x: number;
  y: number;
  vy: number;
  kind: PickupKind;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const LOGICAL_W = 800;
const LOGICAL_H = 560;

export function SpaceDefenseGame({
  runId,
  isPractice,
  combatStats,
  onFinishRun,
}: SpaceDefenseGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(() => soundEngine.isMuted());
  const [autoFire, setAutoFire] = useState(true);
  const [submittingFinish, setSubmittingFinish] = useState(false);

  // HUD state synced periodically so React doesn't re-render 60x/sec unnecessarily
  const [hud, setHud] = useState({
    hull: combatStats.maxHull,
    maxHull: combatStats.maxHull,
    wave: 1,
    score: 0,
    empCharges: 1,
    overdriveSec: 0,
    bossHpPct: 0,
  });

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const autoFireRef = useRef(autoFire);
  autoFireRef.current = autoFire;
  const finishedRef = useRef(false);

  // Mutable simulation state inside ref for zero-GC 60fps loop
  const simRef = useRef({
    shipX: LOGICAL_W / 2,
    shipY: LOGICAL_H - 72,
    targetX: null as number | null,
    targetY: null as number | null,
    hull: combatStats.maxHull,
    invulnMs: 0,
    fireTimerMs: 0,
    overdriveMs: 0,
    empCharges: 1,
    empWaveRadius: 0,
    shakeMs: 0,
    wave: 1,
    waveElapsedMs: 0,
    bossActiveForWave: 0,
    spawnTimerMs: 600,
    nextEntityId: 1,
    asteroidsDestroyed: 0,
    scoutsDestroyed: 0,
    cruisersDestroyed: 0,
    bossesDestroyed: 0,
    shardsCollected: 0,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    pickups: [] as Pickup[],
    particles: [] as Particle[],
    stars: Array.from({ length: 85 }, () => ({
      x: Math.random() * LOGICAL_W,
      y: Math.random() * LOGICAL_H,
      speed: 24 + Math.random() * 95,
      size: Math.random() < 0.25 ? 2.1 : 1.2,
      alpha: 0.3 + Math.random() * 0.65,
    })),
    keys: new Set<string>(),
    pointerDown: false,
  });

  const computeLiveScore = useCallback(() => {
    const s = simRef.current;
    return (
      s.asteroidsDestroyed * SPACE_DEFENSE_CONFIG.POINTS.ASTEROID +
      s.scoutsDestroyed * SPACE_DEFENSE_CONFIG.POINTS.SCOUT +
      s.cruisersDestroyed * SPACE_DEFENSE_CONFIG.POINTS.CRUISER +
      s.bossesDestroyed * SPACE_DEFENSE_CONFIG.POINTS.BOSS +
      s.shardsCollected * SPACE_DEFENSE_CONFIG.POINTS.SHARD +
      (s.wave - 1) * 150
    );
  }, []);

  const concludeRun = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmittingFinish(true);
    const s = simRef.current;
    await onFinishRun({
      runId,
      waveReached: s.wave,
      asteroidsDestroyed: s.asteroidsDestroyed,
      scoutsDestroyed: s.scoutsDestroyed,
      cruisersDestroyed: s.cruisersDestroyed,
      bossesDestroyed: s.bossesDestroyed,
      shardsCollected: s.shardsCollected,
    });
  }, [onFinishRun, runId]);

  const triggerEmp = useCallback(() => {
    const s = simRef.current;
    if (s.empCharges <= 0 || pausedRef.current || finishedRef.current) return;
    s.empCharges -= 1;
    s.empWaveRadius = 12;
    s.shakeMs = 260;
    soundEngine.playEmp();

    // Clear all enemy projectiles & deal heavy EMP damage to all enemies
    s.bullets = s.bullets.filter((b) => b.friendly);
    for (const enemy of s.enemies) {
      enemy.hp -= combatStats.projectileDamage * 4.5;
    }
  }, [combatStats.projectileDamage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shipImg = new Image();
    shipImg.src = '/images/ships/base_ship.webp';

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'KeyP') {
        setPaused((p) => !p);
        return;
      }
      if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        triggerEmp();
        return;
      }
      simRef.current.keys.add(e.code);
      simRef.current.targetX = null;
      simRef.current.targetY = null;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.keys.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function spawnExplosion(x: number, y: number, color: string, count: number) {
      const s = simRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 190;
        s.particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.35,
          color,
          size: 1.8 + Math.random() * 3.2,
        });
      }
    }

    function maybeDropPickup(x: number, y: number, guaranteedShard: boolean = false) {
      const s = simRef.current;
      const roll = Math.random();
      if (guaranteedShard || roll < 0.42) {
        s.pickups.push({ x, y, vy: 115, kind: 'shard', radius: 10 });
      } else if (roll < 0.48) {
        s.pickups.push({ x, y, vy: 105, kind: 'overdrive', radius: 12 });
      } else if (roll < 0.52) {
        s.pickups.push({ x, y, vy: 105, kind: 'hull', radius: 12 });
      } else if (roll < 0.545) {
        s.pickups.push({ x, y, vy: 105, kind: 'emp', radius: 12 });
      }
    }

    function firePlayerVolley() {
      const s = simRef.current;
      const overdrive = s.overdriveMs > 0;
      const barrels = Math.min(4, combatStats.barrels + (overdrive ? 1 : 0));
      const dmg = combatStats.projectileDamage;
      const color = overdrive ? '#f59e0b' : '#22d3ee';

      const offsets =
        barrels === 1
          ? [0]
          : barrels === 2
          ? [-12, 12]
          : barrels === 3
          ? [-16, 0, 16]
          : [-20, -7, 7, 20];

      offsets.forEach((ox, idx) => {
        const spreadVx = barrels >= 3 ? (idx - (barrels - 1) / 2) * 32 : 0;
        s.bullets.push({
          x: s.shipX + ox,
          y: s.shipY - 22,
          vx: spreadVx,
          vy: -640,
          damage: dmg,
          friendly: true,
          color,
          radius: 4,
        });
      });

      soundEngine.playLaser(barrels);
    }

    function spawnEnemyForWave(wave: number) {
      const s = simRef.current;
      const x = 44 + Math.random() * (LOGICAL_W - 88);
      const roll = Math.random();

      if (wave >= 3 && roll < 0.22) {
        // Armored Cruiser
        const hp = 45 + wave * 16;
        s.enemies.push({
          id: s.nextEntityId++,
          kind: 'cruiser',
          x,
          y: -38,
          vx: (Math.random() - 0.5) * 45,
          vy: 58 + Math.min(60, wave * 4),
          radius: 26,
          hp,
          maxHp: hp,
          rot: 0,
          rotSpeed: 0,
          shootTimer: 1100 + Math.random() * 600,
          phase: Math.random() * Math.PI * 2,
        });
      } else if (wave >= 2 && roll < 0.58) {
        // Agile Scout Interceptor
        const hp = 18 + wave * 6;
        s.enemies.push({
          id: s.nextEntityId++,
          kind: 'scout',
          x,
          y: -26,
          vx: 0,
          vy: 115 + Math.min(110, wave * 8),
          radius: 17,
          hp,
          maxHp: hp,
          rot: 0,
          rotSpeed: 0,
          shootTimer: 1350 + Math.random() * 700,
          phase: Math.random() * Math.PI * 2,
        });
      } else {
        // Tumbling Asteroid
        const radius = 16 + Math.random() * 14;
        const hp = Math.round(14 + radius * 0.7 + wave * 4);
        s.enemies.push({
          id: s.nextEntityId++,
          kind: 'asteroid',
          x,
          y: -32,
          vx: (Math.random() - 0.5) * 75,
          vy: 95 + Math.random() * 75 + wave * 6,
          radius,
          hp,
          maxHp: hp,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 3,
          shootTimer: 999_999,
          phase: 0,
        });
      }
    }

    function spawnDreadnoughtBoss(wave: number) {
      const s = simRef.current;
      const hp = 320 + wave * 95;
      s.enemies.push({
        id: s.nextEntityId++,
        kind: 'boss',
        x: LOGICAL_W / 2,
        y: -60,
        vx: 95,
        vy: 45,
        radius: 46,
        hp,
        maxHp: hp,
        rot: 0,
        rotSpeed: 0,
        shootTimer: 900,
        phase: 0,
      });
    }

    let lastTs = performance.now();
    let hudSyncTimer = 0;
    let rafId = 0;

    const frame = (ts: number) => {
      const dtMs = Math.min(48, Math.max(0, ts - lastTs));
      const dt = dtMs / 1000;
      lastTs = ts;

      const s = simRef.current;

      if (!pausedRef.current && !finishedRef.current) {
        // Wave progression
        s.waveElapsedMs += dtMs;
        const activeBoss = s.enemies.find((e) => e.kind === 'boss');

        if (
          !activeBoss &&
          s.waveElapsedMs >= SPACE_DEFENSE_CONFIG.WAVE_DURATION_SEC * 1000
        ) {
          s.wave += 1;
          s.waveElapsedMs = 0;
          if (s.wave % 5 === 0 && s.bossActiveForWave !== s.wave) {
            s.bossActiveForWave = s.wave;
            spawnDreadnoughtBoss(s.wave);
          }
        }

        // Enemy Spawning
        s.spawnTimerMs -= dtMs;
        if (s.spawnTimerMs <= 0) {
          if (!activeBoss || Math.random() < 0.35) {
            spawnEnemyForWave(s.wave);
          }
          const baseInterval = Math.max(320, 980 - s.wave * 55);
          s.spawnTimerMs = baseInterval * (0.75 + Math.random() * 0.5);
        }

        // Timers
        if (s.invulnMs > 0) s.invulnMs = Math.max(0, s.invulnMs - dtMs);
        if (s.overdriveMs > 0) s.overdriveMs = Math.max(0, s.overdriveMs - dtMs);
        if (s.shakeMs > 0) s.shakeMs = Math.max(0, s.shakeMs - dtMs);
        if (s.empWaveRadius > 0) {
          s.empWaveRadius += dt * 1350;
          if (s.empWaveRadius > LOGICAL_W * 1.2) s.empWaveRadius = 0;
        }

        // Ship Movement (Keyboard or Pointer Target)
        let dx = 0;
        let dy = 0;
        if (s.keys.has('ArrowLeft') || s.keys.has('KeyA')) dx -= 1;
        if (s.keys.has('ArrowRight') || s.keys.has('KeyD')) dx += 1;
        if (s.keys.has('ArrowUp') || s.keys.has('KeyW')) dy -= 1;
        if (s.keys.has('ArrowDown') || s.keys.has('KeyS')) dy += 1;

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          s.shipX += (dx / len) * combatStats.moveSpeed * dt;
          s.shipY += (dy / len) * combatStats.moveSpeed * dt;
        } else if (s.targetX !== null && s.targetY !== null) {
          const toX = s.targetX - s.shipX;
          const toY = s.targetY - s.shipY;
          const dist = Math.hypot(toX, toY);
          if (dist > 2) {
            const step = Math.min(dist, combatStats.moveSpeed * 1.35 * dt);
            s.shipX += (toX / dist) * step;
            s.shipY += (toY / dist) * step;
          }
        }

        s.shipX = Math.max(28, Math.min(LOGICAL_W - 28, s.shipX));
        s.shipY = Math.max(60, Math.min(LOGICAL_H - 32, s.shipY));

        // Weapon Firing
        s.fireTimerMs -= dtMs;
        const wantsFire =
          autoFireRef.current || s.keys.has('Space') || s.pointerDown;
        const cooldown =
          s.overdriveMs > 0
            ? combatStats.fireCooldownMs * 0.65
            : combatStats.fireCooldownMs;

        if (wantsFire && s.fireTimerMs <= 0) {
          firePlayerVolley();
          s.fireTimerMs = cooldown;
        }

        // Stars
        for (const star of s.stars) {
          star.y += star.speed * dt;
          if (star.y > LOGICAL_H) {
            star.y = 0;
            star.x = Math.random() * LOGICAL_W;
          }
        }

        // Bullets
        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.y < -30 || b.y > LOGICAL_H + 30 || b.x < -30 || b.x > LOGICAL_W + 30) {
            s.bullets.splice(i, 1);
          }
        }

        // Enemies
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const e = s.enemies[i];
          e.phase += dt * 3;
          e.rot += e.rotSpeed * dt;

          if (e.kind === 'boss') {
            if (e.y < 96) {
              e.y += e.vy * dt;
            } else {
              e.x += e.vx * dt;
              if (e.x < 90 || e.x > LOGICAL_W - 90) e.vx *= -1;
            }
          } else if (e.kind === 'scout') {
            e.x += Math.sin(e.phase) * 115 * dt;
            e.y += e.vy * dt;
          } else {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            if (e.x < e.radius || e.x > LOGICAL_W - e.radius) e.vx *= -1;
          }

          // Enemy shooting
          e.shootTimer -= dtMs;
          if (e.shootTimer <= 0 && e.y > 15 && e.y < LOGICAL_H - 130) {
            if (e.kind === 'scout') {
              s.bullets.push({
                x: e.x,
                y: e.y + e.radius,
                vx: 0,
                vy: 265 + s.wave * 8,
                damage: 1,
                friendly: false,
                color: '#f43f5e',
                radius: 4.5,
              });
              e.shootTimer = Math.max(900, 1800 - s.wave * 60);
            } else if (e.kind === 'cruiser') {
              for (const ox of [-12, 12]) {
                s.bullets.push({
                  x: e.x + ox,
                  y: e.y + e.radius,
                  vx: ox * 2.2,
                  vy: 250 + s.wave * 8,
                  damage: 1,
                  friendly: false,
                  color: '#fb7185',
                  radius: 5,
                });
              }
              e.shootTimer = Math.max(1000, 1900 - s.wave * 55);
            } else if (e.kind === 'boss') {
              const angles = [-0.38, -0.19, 0, 0.19, 0.38];
              for (const ang of angles) {
                s.bullets.push({
                  x: e.x,
                  y: e.y + 34,
                  vx: Math.sin(ang) * 260,
                  vy: Math.cos(ang) * 260,
                  damage: 1,
                  friendly: false,
                  color: '#f59e0b',
                  radius: 5.5,
                });
              }
              e.shootTimer = 1050;
            }
          }

          // Friendly bullet hits on enemy
          for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
            const b = s.bullets[bi];
            if (!b.friendly) continue;
            const dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist <= e.radius + b.radius) {
              e.hp -= b.damage;
              s.bullets.splice(bi, 1);
              spawnExplosion(b.x, b.y, '#38bdf8', 3);
              break;
            }
          }

          // Check enemy death
          if (e.hp <= 0) {
            if (e.kind === 'asteroid') s.asteroidsDestroyed += 1;
            else if (e.kind === 'scout') s.scoutsDestroyed += 1;
            else if (e.kind === 'cruiser') s.cruisersDestroyed += 1;
            else if (e.kind === 'boss') s.bossesDestroyed += 1;

            const isBoss = e.kind === 'boss';
            soundEngine.playExplosion(isBoss || e.kind === 'cruiser');
            spawnExplosion(
              e.x,
              e.y,
              isBoss ? '#f59e0b' : e.kind === 'asteroid' ? '#94a3b8' : '#22d3ee',
              isBoss ? 42 : 14
            );

            if (isBoss) {
              s.shakeMs = 380;
              for (let k = 0; k < 7; k++) {
                s.pickups.push({
                  x: e.x + (Math.random() - 0.5) * 90,
                  y: e.y + (Math.random() - 0.5) * 40,
                  vy: 95 + Math.random() * 45,
                  kind: k === 0 ? 'emp' : k === 1 ? 'hull' : 'shard',
                  radius: 11,
                });
              }
            } else {
              maybeDropPickup(e.x, e.y, e.kind === 'cruiser');
            }

            s.enemies.splice(i, 1);
            continue;
          }

          // Collision with player hull
          if (s.invulnMs <= 0 && Math.hypot(e.x - s.shipX, e.y - s.shipY) < e.radius + 18) {
            s.hull -= 1;
            s.invulnMs = 1300;
            s.shakeMs = 240;
            soundEngine.playDamage();
            spawnExplosion(s.shipX, s.shipY, '#f43f5e', 18);
            if (e.kind !== 'boss') {
              s.enemies.splice(i, 1);
            }
            if (s.hull <= 0) {
              void concludeRun();
              break;
            }
            continue;
          }

          if (e.y > LOGICAL_H + 60) {
            s.enemies.splice(i, 1);
          }
        }

        // Enemy bullets hitting player
        if (s.invulnMs <= 0 && !finishedRef.current) {
          for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
            const b = s.bullets[bi];
            if (b.friendly) continue;
            if (Math.hypot(b.x - s.shipX, b.y - s.shipY) < b.radius + 15) {
              s.bullets.splice(bi, 1);
              s.hull -= 1;
              s.invulnMs = 1300;
              s.shakeMs = 220;
              soundEngine.playDamage();
              spawnExplosion(s.shipX, s.shipY, '#f43f5e', 16);
              if (s.hull <= 0) {
                void concludeRun();
              }
              break;
            }
          }
        }

        // Pickups (with subtle magnet pull)
        const magnetRadius = 80 + combatStats.barrels * 25;
        for (let pi = s.pickups.length - 1; pi >= 0; pi--) {
          const p = s.pickups[pi];
          const toShipX = s.shipX - p.x;
          const toShipY = s.shipY - p.y;
          const dist = Math.hypot(toShipX, toShipY);

          if (dist < magnetRadius && dist > 1) {
            p.x += (toShipX / dist) * 230 * dt;
            p.y += (toShipY / dist) * 230 * dt;
          } else {
            p.y += p.vy * dt;
          }

          if (dist < p.radius + 22) {
            soundEngine.playPickup();
            if (p.kind === 'shard') s.shardsCollected += 1;
            else if (p.kind === 'overdrive') s.overdriveMs = 7000;
            else if (p.kind === 'hull') s.hull = Math.min(combatStats.maxHull, s.hull + 1);
            else if (p.kind === 'emp') s.empCharges = Math.min(3, s.empCharges + 1);
            s.pickups.splice(pi, 1);
            continue;
          }

          if (p.y > LOGICAL_H + 30) {
            s.pickups.splice(pi, 1);
          }
        }

        // Particles
        for (let k = s.particles.length - 1; k >= 0; k--) {
          const pt = s.particles[k];
          pt.life += dt;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          if (pt.life >= pt.maxLife) {
            s.particles.splice(k, 1);
          }
        }
      }

      // ======================================================================
      // Render Frame
      // ======================================================================
      ctx.save();
      ctx.fillStyle = '#050913';
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

      if (s.shakeMs > 0) {
        ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      }

      // Starfield
      for (const star of s.stars) {
        ctx.fillStyle = `rgba(210, 232, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      // EMP Shockwave Ring
      if (s.empWaveRadius > 0) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.shipX, s.shipY, s.empWaveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Pickups
      for (const p of s.pickups) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.kind === 'shard') {
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(8, 0);
          ctx.lineTo(0, 10);
          ctx.lineTo(-8, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle =
            p.kind === 'overdrive'
              ? '#f59e0b'
              : p.kind === 'hull'
              ? '#10b981'
              : '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#041019';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            p.kind === 'overdrive' ? 'OVR' : p.kind === 'hull' ? '+HP' : 'EMP',
            0,
            0.5
          );
        }
        ctx.restore();
      }

      // Bullets
      for (const b of s.bullets) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        if (b.friendly) {
          ctx.roundRect(b.x - 2.2, b.y - 9, 4.4, 16, 2);
        } else {
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Enemies
      for (const e of s.enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);

        if (e.kind === 'asteroid') {
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let v = 0; v < 7; v++) {
            const a = (v / 7) * Math.PI * 2;
            const r = e.radius * (v % 2 === 0 ? 1 : 0.78);
            if (v === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (e.kind === 'scout') {
          ctx.fillStyle = '#e11d48';
          ctx.beginPath();
          ctx.moveTo(0, e.radius);
          ctx.lineTo(-e.radius, -e.radius * 0.85);
          ctx.lineTo(0, -e.radius * 0.35);
          ctx.lineTo(e.radius, -e.radius * 0.85);
          ctx.closePath();
          ctx.fill();
        } else if (e.kind === 'cruiser') {
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(0, e.radius);
          ctx.lineTo(-e.radius, -4);
          ctx.lineTo(-e.radius * 0.6, -e.radius);
          ctx.lineTo(e.radius * 0.6, -e.radius);
          ctx.lineTo(e.radius, -4);
          ctx.closePath();
          ctx.fill();
        } else if (e.kind === 'boss') {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(0, e.radius);
          ctx.lineTo(-e.radius * 1.25, 4);
          ctx.lineTo(-e.radius * 0.8, -e.radius * 0.9);
          ctx.lineTo(e.radius * 0.8, -e.radius * 0.9);
          ctx.lineTo(e.radius * 1.25, 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Cruiser health bar
        if (e.kind === 'cruiser' && e.hp < e.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(e.x - 18, e.y - e.radius - 10, 36, 4);
          ctx.fillStyle = '#fb923c';
          ctx.fillRect(e.x - 18, e.y - e.radius - 10, 36 * (e.hp / e.maxHp), 4);
        }
      }

      // Player Ship
      const blinkSkip = s.invulnMs > 0 && Math.floor(s.invulnMs / 90) % 2 === 0;
      if (!blinkSkip) {
        ctx.save();
        ctx.translate(s.shipX, s.shipY);

        // Thruster plume
        ctx.fillStyle = s.overdriveMs > 0 ? '#f59e0b' : '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(-7, 20);
        ctx.lineTo(0, 30 + Math.random() * 10);
        ctx.lineTo(7, 20);
        ctx.closePath();
        ctx.fill();

        if (shipImg.complete && shipImg.naturalWidth > 0) {
          ctx.drawImage(shipImg, -26, -26, 52, 52);
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(0, -24);
          ctx.lineTo(-20, 20);
          ctx.lineTo(20, 20);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Particles
      for (const pt of s.particles) {
        const alpha = 1 - pt.life / pt.maxLife;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Sync React HUD ~10x/sec
      hudSyncTimer += dtMs;
      if (hudSyncTimer >= 100) {
        hudSyncTimer = 0;
        const boss = s.enemies.find((e) => e.kind === 'boss');
        setHud({
          hull: Math.max(0, s.hull),
          maxHull: combatStats.maxHull,
          wave: s.wave,
          score: computeLiveScore(),
          empCharges: s.empCharges,
          overdriveSec: Math.ceil(s.overdriveMs / 1000),
          bossHpPct: boss ? Math.max(0, (boss.hp / boss.maxHp) * 100) : 0,
        });
      }

      if (!finishedRef.current) {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [combatStats, computeLiveScore, concludeRun, triggerEmp]);

  function updatePointerTarget(clientX: number, clientY: number, isTouch: boolean) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_W / rect.width;
    const scaleY = LOGICAL_H / rect.height;
    simRef.current.targetX = (clientX - rect.left) * scaleX;
    // Offset touch slightly above thumb so player always sees their ship
    simRef.current.targetY =
      (clientY - rect.top) * scaleY - (isTouch ? 42 : 0);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Live Tactical HUD Bar */}
      <div
        className="panel"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div className="stat-label">Sector</div>
            <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
              Wave {hud.wave} {isPractice ? '(Sim)' : ''}
            </div>
          </div>

          <div>
            <div className="stat-label">Score</div>
            <div className="font-mono" style={{ fontWeight: 700 }}>
              {hud.score.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="stat-label">Hull Integrity</div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '3px' }}>
              {Array.from({ length: hud.maxHull }).map((_, idx) => (
                <span
                  key={idx}
                  style={{
                    width: '16px',
                    height: '9px',
                    borderRadius: '2px',
                    background:
                      idx < hud.hull
                        ? 'var(--accent-emerald)'
                        : 'hsla(210, 20%, 50%, 0.25)',
                  }}
                />
              ))}
            </div>
          </div>

          {hud.overdriveSec > 0 && (
            <span className="status-tag amber">Overdrive {hud.overdriveSec}s</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-amber btn-sm"
            disabled={hud.empCharges <= 0 || paused || submittingFinish}
            onClick={triggerEmp}
            title="Trigger EMP Shockwave (E or Shift)"
          >
            <Zap size={14} />
            EMP ({hud.empCharges})
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAutoFire((v) => !v)}
          >
            <Shield size={14} />
            Auto-Fire: {autoFire ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMuted(soundEngine.toggleMute())}
            aria-label="Toggle Sound"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? 'Resume' : 'Pause'}
          </button>

          <button
            id="btn-extract-sortie"
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={submittingFinish}
            onClick={() => void concludeRun()}
          >
            <LogOut size={14} />
            Extract &amp; Bank
          </button>
        </div>
      </div>

      {/* Boss Health Bar */}
      {hud.bossHpPct > 0 && (
        <div className="panel" style={{ padding: '10px 16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--accent-amber)',
              marginBottom: '5px',
            }}
          >
            <span>SECTOR DREADNOUGHT DETECTED</span>
            <span className="font-mono">{hud.bossHpPct.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill amber" style={{ width: `${hud.bossHpPct}%` }} />
          </div>
        </div>
      )}

      {/* 2D Canvas Stage */}
      <div className="arena-wrapper">
        <canvas
          ref={canvasRef}
          width={LOGICAL_W}
          height={LOGICAL_H}
          className="arena-canvas"
          onMouseMove={(e) => updatePointerTarget(e.clientX, e.clientY, false)}
          onMouseDown={(e) => {
            simRef.current.pointerDown = true;
            updatePointerTarget(e.clientX, e.clientY, false);
          }}
          onMouseUp={() => {
            simRef.current.pointerDown = false;
          }}
          onMouseLeave={() => {
            simRef.current.pointerDown = false;
            simRef.current.targetX = null;
            simRef.current.targetY = null;
          }}
          onTouchStart={(e) => {
            simRef.current.pointerDown = true;
            const t = e.touches[0];
            if (t) updatePointerTarget(t.clientX, t.clientY, true);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) updatePointerTarget(t.clientX, t.clientY, true);
          }}
          onTouchEnd={() => {
            simRef.current.pointerDown = false;
          }}
        />

        {(paused || submittingFinish) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(4, 8, 18, 0.78)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
            }}
          >
            <h3 style={{ fontSize: '1.4rem' }}>
              {submittingFinish ? 'TRANSMITTING SORTIE TELEMETRY...' : 'SORTIE PAUSED'}
            </h3>
            {!submittingFinish && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPaused(false)}
              >
                <Play size={16} /> Resume Combat
              </button>
            )}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Controls: Move with <strong>WASD / Arrow Keys</strong> or <strong>Mouse / Touch Drag</strong> ·{' '}
        <strong>E / Shift</strong> triggers EMP Shockwave · <strong>P</strong> Pauses.
      </p>
    </div>
  );
}
