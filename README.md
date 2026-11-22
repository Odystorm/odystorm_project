# OdyStorm Space Defense (`v2-web`)

Standalone cross-device web game and orbital mining platform built with **Next.js** (frontend) and **Bun + Hono + Drizzle ORM + `bun:sqlite`** (backend), with zero Telegram dependencies.

## Architecture

- **`apps/web`** — Next.js 15 App Router frontend, bespoke Vanilla CSS aerospace telemetry design system, PWA manifest + Web Push Service Worker, and 60fps HTML5 2D Canvas Space Defense arcade shooter.
- **`apps/api`** — Bun (`Bun.serve`) HTTP & native WebSocket backend powered by Hono, Better Auth (Email/Password, Google/Discord/X OAuth, Guest `anonymous` sessions with seamless account binding, role-based Admin), Drizzle ORM, `bun:sqlite` (WAL mode), and VAPID Browser Web Push.
- **`packages/shared`** — Shared TypeScript types, Zod request schemas, 15-tier Hangar upgrade & Officer rank tables, and server-authoritative Space Defense scoring bounds.

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **(Optional) Configure environment variables:**
   Copy `.env.example` to `.env` to customize `BETTER_AUTH_SECRET`, `ADMIN_EMAILS`, or optional Social OAuth credentials (`GOOGLE_CLIENT_ID`, `DISCORD_CLIENT_ID`, `TWITTER_CLIENT_ID`).

3. **Start the Bun backend (`http://127.0.0.1:4000`) and Next.js frontend (`http://localhost:3000`):**
   ```bash
   bun run dev:api
   bun run dev:web
   ```
   *(The SQLite database and default missions/announcements initialize automatically on first boot.)*

4. **Run automated tests & typechecks:**
   ```bash
   bun test apps/api/tests/api.test.ts
   bun run typecheck
   bun run build
   ```
