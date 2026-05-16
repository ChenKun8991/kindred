# 01 — Architecture

> System architecture, data flow, and component boundaries. Read this before any phase doc.

---

## 1. High-level architecture

The system has four runtime components and three external services.

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                   │
│         (browser)                  (Telegram app)             │
└───────────┬──────────────────────────────┬──────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐      ┌───────────────────────────────┐
│   WEB DASHBOARD        │      │   TELEGRAM BOT WORKER          │
│   Next.js on Vercel    │      │   grammY on Railway            │
│   - Telegram login     │      │   - receives bot commands      │
│   - contact CRUD UI    │      │   - sends notifications        │
│   - AI chat UI         │      │   - quick lookups              │
│   - event timeline     │      │                                │
└───────────┬───────────┘      └───────────────┬───────────────┘
            │                                   │
            └─────────────┬─────────────────────┘
                          ▼
            ┌──────────────────────────────┐
            │   SUPABASE (PostgreSQL)      │
            │   - all app data             │
            │   - Row-Level Security       │
            │   - pg_cron scheduler        │
            │   - Edge Functions           │
            └──────────────┬───────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Claude API   │  │ Stripe       │  │ Google APIs      │
│ (AI chat +   │  │ (payments +  │  │ (Calendar +      │
│  planning)   │  │  webhooks)   │  │  People/Contacts)│
└──────────────┘  └──────────────┘  └──────────────────┘
```

## 2. Component responsibilities

### 2.1 Web dashboard (Next.js / Vercel)
The primary product surface. Owns:
- Telegram login flow and session management
- All contact, event, and interaction CRUD via server actions / route handlers
- AI chat UI (calls Claude API server-side, never client-side)
- Event timeline and dashboard home
- Settings, Stripe checkout redirect, Google OAuth initiation
- Server-side rendering for authenticated pages

It does **not** run scheduled jobs and does **not** send Telegram messages directly (the bot worker owns outbound Telegram).

### 2.2 Telegram bot worker (grammY / Railway)
A long-running Node process. Owns:
- Receiving and responding to bot commands (`/start`, `/who`, `/upcoming`, `/plan`)
- Sending proactive notifications (triggered by the scheduler)
- Quick AI lookups on the go (reuses the same Claude service module)

It shares the database and the AI service logic with the web app but runs as a separate deployment because it needs a persistent process (webhooks/long-poll).

### 2.3 Supabase (PostgreSQL + cron + edge functions)
The single source of truth. Owns:
- All persistent data (see `02-DATA-MODEL.md`)
- Row-Level Security so a user can only ever read/write their own rows
- `pg_cron` job that runs daily and enqueues notification jobs
- Edge Function that processes the notification queue and calls the bot worker's send endpoint

### 2.4 Scheduler (inside Supabase)
A `pg_cron` job runs every day at a fixed UTC hour. It:
1. Queries `events` for any event whose date is `today + notify_days_before`
2. Inserts a row into `notification_queue` for each match
3. An Edge Function picks up queued notifications, asks Claude for a plan if needed, and POSTs to the bot worker to deliver via Telegram

## 3. Trust & data-flow rules

These are invariants. Every phase must respect them.

1. **The Claude API is only ever called server-side.** The API key never reaches the browser or the Telegram client.
2. **Row-Level Security is mandatory** on every user-data table. The app role can never read across users.
3. **The bot worker authenticates to the web app / edge function** via a shared secret header for the "send notification" endpoint — it is not a public endpoint.
4. **OAuth tokens (Google) are encrypted at rest** and only decrypted server-side when making an API call.
5. **No raw third-party message content is stored.** Only user-entered facts and AI-extracted structured fields.

## 4. Authentication flow (Telegram Login)

```
1. User clicks "Log in with Telegram" widget on the web app
2. Telegram returns a signed payload: { id, first_name, username, photo_url, auth_date, hash }
3. Server verifies `hash` using HMAC-SHA256 with the bot token as the key
4. If valid and auth_date is fresh (< 24h), upsert a row in `users` keyed by telegram_id
5. NextAuth issues a session JWT; telegram_id is the stable user identity everywhere
```

The same `telegram_id` links the web account and the bot, so a notification sent by the bot reaches the same person who logs into the dashboard.

## 5. AI service module (shared)

A single module `lib/ai/` is imported by both the web app and the bot worker. It exposes:

- `summarizePerson(person, interactions)` → relationship summary text
- `chatAboutPerson(person, interactions, history, message)` → chat reply
- `generateEventPlan(person, event, calendarFreeSlots?)` → structured plan

All functions take structured profile data, build a prompt, call Claude, and return typed output. Prompt templates live in `lib/ai/prompts/` and are versioned. See `04-PHASE-2-INTELLIGENCE.md` for prompt contracts.

## 6. Environments

| Env | Web | Bot | DB |
|---|---|---|---|
| Local | `next dev` | grammY long-poll | Supabase local or dev project |
| Staging | Vercel preview | Railway staging | Supabase staging project |
| Production | Vercel prod | Railway prod | Supabase prod project |

Each environment has its own Telegram bot (different token), its own Stripe keys (test vs live), and its own Google OAuth client.

## 7. Repository structure

```
/kindred
  /apps
    /web            → Next.js dashboard
    /bot            → grammY worker
  /packages
    /db             → Supabase types, migrations, query helpers
    /ai             → shared Claude service + prompts
    /shared         → shared TS types, validation schemas (zod)
  /supabase
    /migrations     → SQL migrations
    /functions      → edge functions
  /specs            → these markdown spec files
```

Monorepo (pnpm workspaces or Turborepo). The `db`, `ai`, and `shared` packages are consumed by both `web` and `bot` so logic is never duplicated.
