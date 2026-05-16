# Kindred — Project Overview

> A personal relationship manager. A web dashboard backed by a relationship database, with a Telegram bot as the notification and quick-access layer. The product helps people remember and show up for the people who matter — never miss a birthday, get AI-generated plans for special events, and keep a living memory of every relationship.

---

## 1. Product summary

| | |
|---|---|
| **Product name** | Kindred (working title) |
| **Category** | Personal CRM / relationship manager |
| **Core surface** | Web dashboard |
| **Secondary surface** | Telegram bot (notifications + quick chat) |
| **Auth** | Telegram Login (no email/password) |
| **Primary user** | Busy professionals, expats, people who care but forget |
| **Monetization** | Freemium SaaS — free tier + $9/mo Pro via Stripe |

## 2. The problem

People genuinely care about their friends, family, and partners — but life makes them forget. They miss birthdays, lose track of who they haven't spoken to in months, and scramble last-minute when a special occasion arrives. Existing tools are either professional networking CRMs (built for sales, not relationships) or simple reminder apps (no intelligence, no context).

## 3. The solution

A system with three layers:

1. **The database** — a structured, living record of every person in your life: birthday, how you met, hobbies, food preferences, gift history, notes, and more.
2. **The dashboard** — a web app where you manage everything: see upcoming events, browse and edit people, and chat with an AI that knows each person's full context.
3. **The bot** — a Telegram bot that proactively notifies you ("Sarah's birthday is in 3 days, here's a plan") so you get value without opening anything.

## 4. What makes it different

- **Lives where you are** — Telegram login means zero signup friction; notifications arrive where you already read messages.
- **AI that knows the person** — every contact has an AI chat with their full profile as context. Not generic advice — advice about *this specific person*.
- **Relationship tiers** — a partner gets a detailed event plan; a casual friend gets a simple nudge. Context-appropriate.
- **Calendar-aware planning** — the planner checks when you're actually free before suggesting an evening.

## 5. The full spec document set

This project is built spec-first. Read documents in order. Each phase doc is self-contained and defines exactly what to build, the acceptance criteria, and the data contracts.

| Doc | Purpose |
|---|---|
| `00-PROJECT-OVERVIEW.md` | This file — the why and the what |
| `01-ARCHITECTURE.md` | System architecture, data flow, component boundaries |
| `02-DATA-MODEL.md` | Full database schema, all tables, fields, relationships, SQL |
| `03-PHASE-1-FOUNDATION.md` | Auth, database, dashboard shell, contact CRUD |
| `04-PHASE-2-INTELLIGENCE.md` | AI chat per contact, Telegram bot, notifications |
| `05-PHASE-3-MONETIZATION.md` | Stripe, free vs Pro gating, subscription lifecycle |
| `06-PHASE-4-INTEGRATIONS.md` | Google Calendar + Contacts OAuth and sync |
| `07-PHASE-5-LAUNCH.md` | Onboarding, polish, referral, launch readiness |
| `08-API-CONTRACTS.md` | Every internal API endpoint, request/response shapes |
| `09-NON-FUNCTIONAL.md` | Security, privacy, performance, cost, compliance |

## 6. Phase philosophy

Each phase ends with a **shippable, demonstrable milestone**. You should be able to stop after any phase and have something real.

```
Phase 1  →  You can log in and manage your relationship database
Phase 2  →  The AI and bot make it genuinely useful (the "wow")
Phase 3  →  You can charge money and have paying users
Phase 4  →  Integrations remove manual work and add stickiness
Phase 5  →  Public launch with onboarding and growth loops
```

**Rule:** do not start a phase until the previous phase's acceptance criteria are all met. Do not build ahead.

## 7. Tech stack (locked)

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui |
| Auth | Telegram Login Widget + NextAuth.js |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| AI | Claude API (`claude-sonnet-4-20250514`) |
| Bot | grammY (Node.js, TypeScript) |
| Scheduler | Supabase `pg_cron` + Edge Functions |
| Payments | Stripe Checkout + Webhooks |
| Integrations | Google OAuth2 (Calendar API, People API) |
| Hosting | Vercel (web) + Railway (bot worker) |

## 8. Success metrics

| Metric | Target by month 6 |
|---|---|
| Registered users | 1,000 |
| Free → Pro conversion | 8–12% |
| Monthly retention (active) | > 80% |
| MRR | $900+ |
| Customer acquisition cost | < $5 |

## 9. Out of scope (explicitly)

- Native mobile apps (web is responsive; mobile app is post-launch)
- Reading users' WhatsApp/Instagram private messages via unofficial APIs (legal/ToS risk — use data-export upload instead, post-launch)
- Team/multi-user shared networks (couple/family plan is a later iteration)
- Reading the user's other Telegram chats (platform-impossible)
